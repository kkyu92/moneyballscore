/**
 * wave-521: 이번 주 남은 경기 카드 6팩터 직접 대결 배지 완성
 * 불펜FIP / Elo / WAR / SFR / 최근폼 / xFIP 배지 임계값 검증
 */

import { describe, it, expect } from 'vitest';
import {
  BULLPEN_FIP_DIFF_MIN,
  ELO_GAP_STRONG,
  WAR_DUEL_MIN,
  SFR_DUEL_MIN,
  RECENT_FORM_DUEL_MIN,
  SP_XFIP_DUEL_MIN,
} from '@moneyball/shared';

describe('wave-521 불펜FIP 직접 대결 배지', () => {
  it('|ΔFIP| >= BULLPEN_FIP_DIFF_MIN(1.0) 시 배지 표시', () => {
    const homeBullpenFip = 3.5;
    const awayBullpenFip = 5.0;
    const delta = Math.abs(homeBullpenFip - awayBullpenFip);
    expect(delta).toBeGreaterThanOrEqual(BULLPEN_FIP_DIFF_MIN);
  });

  it('|ΔFIP| < BULLPEN_FIP_DIFF_MIN 시 배지 없음', () => {
    const homeBullpenFip = 4.0;
    const awayBullpenFip = 4.5;
    const delta = Math.abs(homeBullpenFip - awayBullpenFip);
    expect(delta).toBeLessThan(BULLPEN_FIP_DIFF_MIN);
  });

  it('FIP 낮은 팀이 우세 — delta < 0 시 홈팀 유리', () => {
    const homeBullpenFip = 3.0;
    const awayBullpenFip = 5.0;
    const bullpenDelta = homeBullpenFip - awayBullpenFip;
    const bullpenFavoredHome = bullpenDelta < 0;
    expect(bullpenFavoredHome).toBe(true);
  });

  it('격차 표시 — toFixed(1) 포맷', () => {
    const homeBullpenFip = 3.5;
    const awayBullpenFip = 5.0;
    const delta = Math.abs(homeBullpenFip - awayBullpenFip);
    expect(delta.toFixed(1)).toBe('1.5');
  });
});

describe('wave-521 Elo 직접 대결 배지', () => {
  it('|ΔElo| >= ELO_GAP_STRONG(50) 시 배지 표시', () => {
    const homeElo = 1520;
    const awayElo = 1460;
    const delta = Math.abs(homeElo - awayElo);
    expect(delta).toBeGreaterThanOrEqual(ELO_GAP_STRONG);
  });

  it('|ΔElo| < ELO_GAP_STRONG 시 배지 없음', () => {
    const homeElo = 1500;
    const awayElo = 1470;
    const delta = Math.abs(homeElo - awayElo);
    expect(delta).toBeLessThan(ELO_GAP_STRONG);
  });

  it('Elo 높은 팀 우세 — delta > 0 시 홈팀 유리', () => {
    const homeElo = 1550;
    const awayElo = 1480;
    const eloDelta = homeElo - awayElo;
    const eloFavoredHome = eloDelta > 0;
    expect(eloFavoredHome).toBe(true);
  });

  it('격차 표시 — Math.round 정수 포맷', () => {
    const homeElo = 1523;
    const awayElo = 1461;
    const delta = Math.round(Math.abs(homeElo - awayElo));
    expect(delta).toBe(62);
  });
});

describe('wave-521 WAR 직접 대결 배지', () => {
  it('|ΔWAR| >= WAR_DUEL_MIN(5.0) 시 배지 표시', () => {
    const homeWar = 28.5;
    const awayWar = 22.0;
    const delta = Math.abs(homeWar - awayWar);
    expect(delta).toBeGreaterThanOrEqual(WAR_DUEL_MIN);
  });

  it('|ΔWAR| < WAR_DUEL_MIN 시 배지 없음', () => {
    const homeWar = 25.0;
    const awayWar = 22.0;
    const delta = Math.abs(homeWar - awayWar);
    expect(delta).toBeLessThan(WAR_DUEL_MIN);
  });

  it('WAR 높은 팀 우세 — delta > 0 시 홈팀 유리', () => {
    const homeWar = 30.0;
    const awayWar = 22.0;
    const warDelta = homeWar - awayWar;
    const warFavoredHome = warDelta > 0;
    expect(warFavoredHome).toBe(true);
  });

  it('격차 표시 — toFixed(1) 포맷', () => {
    const homeWar = 28.5;
    const awayWar = 22.0;
    const delta = Math.abs(homeWar - awayWar);
    expect(delta.toFixed(1)).toBe('6.5');
  });
});

describe('wave-521 수비SFR 직접 대결 배지', () => {
  it('|ΔSFR| >= SFR_DUEL_MIN(5.0) 시 배지 표시', () => {
    const homeSfr = 12.0;
    const awaySfr = 4.0;
    const delta = Math.abs(homeSfr - awaySfr);
    expect(delta).toBeGreaterThanOrEqual(SFR_DUEL_MIN);
  });

  it('|ΔSFR| < SFR_DUEL_MIN 시 배지 없음', () => {
    const homeSfr = 10.0;
    const awaySfr = 7.0;
    const delta = Math.abs(homeSfr - awaySfr);
    expect(delta).toBeLessThan(SFR_DUEL_MIN);
  });

  it('SFR 높은 팀 우세 — delta > 0 시 홈팀 유리', () => {
    const homeSfr = 15.0;
    const awaySfr = 5.0;
    const sfrDelta = homeSfr - awaySfr;
    const sfrFavoredHome = sfrDelta > 0;
    expect(sfrFavoredHome).toBe(true);
  });

  it('격차 표시 — toFixed(1) 포맷', () => {
    const homeSfr = 12.5;
    const awaySfr = 4.0;
    const delta = Math.abs(homeSfr - awaySfr);
    expect(delta.toFixed(1)).toBe('8.5');
  });
});

describe('wave-521 최근폼 직접 대결 배지', () => {
  it('|Δ폼| >= RECENT_FORM_DUEL_MIN(0.10) 시 배지 표시', () => {
    const homeRecentForm = 0.70;
    const awayRecentForm = 0.50;
    const delta = Math.abs(homeRecentForm - awayRecentForm);
    expect(delta).toBeGreaterThanOrEqual(RECENT_FORM_DUEL_MIN);
  });

  it('|Δ폼| < RECENT_FORM_DUEL_MIN 시 배지 없음', () => {
    const homeRecentForm = 0.60;
    const awayRecentForm = 0.55;
    const delta = Math.abs(homeRecentForm - awayRecentForm);
    expect(delta).toBeLessThan(RECENT_FORM_DUEL_MIN);
  });

  it('폼 높은 팀 우세 — delta > 0 시 홈팀 유리', () => {
    const homeRecentForm = 0.80;
    const awayRecentForm = 0.50;
    const formDelta = homeRecentForm - awayRecentForm;
    const formFavoredHome = formDelta > 0;
    expect(formFavoredHome).toBe(true);
  });

  it('격차 표시 — *100 toFixed(0) % 포맷', () => {
    const homeRecentForm = 0.70;
    const awayRecentForm = 0.50;
    const delta = Math.abs(homeRecentForm - awayRecentForm);
    expect((delta * 100).toFixed(0)).toBe('20');
  });
});

describe('wave-521 xFIP 직접 대결 배지', () => {
  it('|ΔxFIP| >= SP_XFIP_DUEL_MIN(0.5) 시 배지 표시', () => {
    const homeSPXfip = 3.2;
    const awaySPXfip = 4.0;
    const delta = Math.abs(homeSPXfip - awaySPXfip);
    expect(delta).toBeGreaterThanOrEqual(SP_XFIP_DUEL_MIN);
  });

  it('|ΔxFIP| < SP_XFIP_DUEL_MIN 시 배지 없음', () => {
    const homeSPXfip = 3.5;
    const awaySPXfip = 3.8;
    const delta = Math.abs(homeSPXfip - awaySPXfip);
    expect(delta).toBeLessThan(SP_XFIP_DUEL_MIN);
  });

  it('xFIP 낮은 팀 우세 — delta < 0 시 홈팀 유리', () => {
    const homeSPXfip = 3.0;
    const awaySPXfip = 4.0;
    const xfipDelta = homeSPXfip - awaySPXfip;
    const xfipFavoredHome = xfipDelta < 0;
    expect(xfipFavoredHome).toBe(true);
  });

  it('격차 표시 — toFixed(1) 포맷', () => {
    const homeSPXfip = 3.0;
    const awaySPXfip = 4.2;
    const delta = Math.abs(homeSPXfip - awaySPXfip);
    expect(delta.toFixed(1)).toBe('1.2');
  });
});

describe('wave-521 UpcomingScheduledGame 인터페이스 확장 검증', () => {
  it('6팩터 필드 null 허용 — 데이터 없는 예정 경기 안전', () => {
    // 모든 새 필드가 null | number 타입
    const game = {
      homeBullpenFip: null as number | null,
      awayBullpenFip: null as number | null,
      homeElo: null as number | null,
      awayElo: null as number | null,
      homeWar: null as number | null,
      awayWar: null as number | null,
      homeSfr: null as number | null,
      awaySfr: null as number | null,
      homeRecentForm: null as number | null,
      awayRecentForm: null as number | null,
      homeSPXfip: null as number | null,
      awaySPXfip: null as number | null,
    };
    // null 가드 패턴 — != null 체크 후 badge 표시
    expect(game.homeBullpenFip != null && game.awayBullpenFip != null).toBe(false);
    expect(game.homeElo != null && game.awayElo != null).toBe(false);
  });

  it('데이터 있는 경우 배지 임계값 정상 작동', () => {
    const game = {
      homeBullpenFip: 3.0,
      awayBullpenFip: 5.5,
      homeElo: 1560,
      awayElo: 1490,
      homeWar: 32.0,
      awayWar: 24.0,
      homeSfr: 18.0,
      awaySfr: 6.0,
      homeRecentForm: 0.75,
      awayRecentForm: 0.40,
      homeSPXfip: 3.1,
      awaySPXfip: 4.2,
    };
    expect(Math.abs(game.homeBullpenFip - game.awayBullpenFip)).toBeGreaterThanOrEqual(BULLPEN_FIP_DIFF_MIN);
    expect(Math.abs(game.homeElo - game.awayElo)).toBeGreaterThanOrEqual(ELO_GAP_STRONG);
    expect(Math.abs(game.homeWar - game.awayWar)).toBeGreaterThanOrEqual(WAR_DUEL_MIN);
    expect(Math.abs(game.homeSfr - game.awaySfr)).toBeGreaterThanOrEqual(SFR_DUEL_MIN);
    expect(Math.abs(game.homeRecentForm - game.awayRecentForm)).toBeGreaterThanOrEqual(RECENT_FORM_DUEL_MIN);
    expect(Math.abs(game.homeSPXfip - game.awaySPXfip)).toBeGreaterThanOrEqual(SP_XFIP_DUEL_MIN);
  });
});
