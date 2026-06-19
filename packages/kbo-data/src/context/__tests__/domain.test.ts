/**
 * domain.ts tests — plan #23 Step 2.
 *
 * 검증 축:
 *   - KBO_PARKS: 10 홈팀 모두 박제 + parkPf source-of-truth 동기
 *   - getSeasonPhase: 월별 단계 매핑 + 엣지 (10월/11월/2월) 처리
 *   - render* helper: LLM prompt 형식 일관성
 *   - 라이벌리: shared `KBO_RIVALRIES` source 정합
 */

import { describe, expect, it } from 'vitest';
import { KBO_TEAMS, KBO_RIVALRIES, type TeamCode } from '@moneyball/shared';
import {
  KBO_PARKS,
  KBO_DOMAIN_KB,
  SEASON_PHASES,
  TIME_WINDOWS,
  getSeasonPhase,
  renderParkForLLM,
  renderRivalryForLLM,
  renderSeasonForLLM,
  renderTimeWindowsForLLM,
} from '../domain';

describe('KBO_PARKS', () => {
  it('10 홈팀 모두 박제', () => {
    const codes = Object.keys(KBO_TEAMS) as TeamCode[];
    expect(codes.length).toBe(10);
    for (const code of codes) {
      expect(KBO_PARKS[code]).toBeDefined();
      expect(KBO_PARKS[code].team_code).toBe(code);
    }
  });

  it('park_factor = parkPf / 100 ratio 환산', () => {
    expect(KBO_PARKS.LG.park_factor).toBe(0.95);   // 잠실 투고
    expect(KBO_PARKS.SS.park_factor).toBe(1.08);   // 대구 극단적 타고
    expect(KBO_PARKS.WO.park_factor).toBe(0.92);   // 고척 극단적 투고
  });

  it('park_factor bounds: 0.7~1.3 (MetricRegistry.park_factor 와 정합)', () => {
    for (const code of Object.keys(KBO_PARKS) as TeamCode[]) {
      const f = KBO_PARKS[code].park_factor;
      expect(f).toBeGreaterThanOrEqual(0.7);
      expect(f).toBeLessThanOrEqual(1.3);
    }
  });

  it('stadium_full / short_name / hint_ko 박제', () => {
    expect(KBO_PARKS.LG.stadium_full).toContain('서울종합운동장');
    expect(KBO_PARKS.LG.short_name).toBe('잠실');
    expect(KBO_PARKS.LG.hint_ko).toContain('투수 친화');
  });

  it('잠실 공유 — LG / OB 동일 stadium', () => {
    expect(KBO_PARKS.LG.stadium_full).toBe(KBO_PARKS.OB.stadium_full);
    expect(KBO_PARKS.LG.short_name).toBe(KBO_PARKS.OB.short_name);
  });

  it('frozen — 런타임 변경 차단', () => {
    expect(Object.isFrozen(KBO_PARKS)).toBe(true);
  });
});

describe('getSeasonPhase', () => {
  it('월별 단계 매핑', () => {
    expect(getSeasonPhase(new Date('2026-03-15'))).toBe('preseason');
    expect(getSeasonPhase(new Date('2026-04-15'))).toBe('early');
    expect(getSeasonPhase(new Date('2026-05-15'))).toBe('mid');
    expect(getSeasonPhase(new Date('2026-07-15'))).toBe('mid');
    expect(getSeasonPhase(new Date('2026-08-15'))).toBe('late');
    expect(getSeasonPhase(new Date('2026-09-15'))).toBe('late');
    expect(getSeasonPhase(new Date('2026-10-15'))).toBe('postseason');
    expect(getSeasonPhase(new Date('2026-11-15'))).toBe('postseason');
    expect(getSeasonPhase(new Date('2026-12-15'))).toBe('offseason');
    expect(getSeasonPhase(new Date('2026-01-15'))).toBe('offseason');
    expect(getSeasonPhase(new Date('2026-02-15'))).toBe('offseason');
  });

  it('Invalid Date → throw', () => {
    expect(() => getSeasonPhase(new Date('invalid'))).toThrow();
  });

  it('SEASON_PHASES 12개월 cover 검증 (gap 차단)', () => {
    const covered = new Set<number>();
    for (const phase of Object.keys(SEASON_PHASES) as Array<keyof typeof SEASON_PHASES>) {
      for (const m of SEASON_PHASES[phase].months) covered.add(m);
    }
    for (let m = 1; m <= 12; m++) {
      expect(covered.has(m)).toBe(true);
    }
  });
});

describe('TIME_WINDOWS', () => {
  it('predictor / retro / agent 공유 표준 값', () => {
    expect(TIME_WINDOWS.recent_form.games).toBe(10);
    expect(TIME_WINDOWS.h2h_window.days).toBe(30);
    expect(TIME_WINDOWS.season.days).toBe(180);
  });

  it('frozen', () => {
    expect(Object.isFrozen(TIME_WINDOWS)).toBe(true);
  });
});

describe('renderParkForLLM', () => {
  it('짧은 한 줄 LLM friendly', () => {
    const s = renderParkForLLM('LG');
    expect(s).toContain('잠실');
    expect(s).toContain('park_factor=0.95');
    expect(s).toContain('투수 친화');
  });

  it('10 팀 모두 한 줄 박제 (LLM 일관성)', () => {
    for (const code of Object.keys(KBO_PARKS) as TeamCode[]) {
      const s = renderParkForLLM(code);
      expect(s).toMatch(/park_factor=\d+\.\d+/);
    }
  });
});

describe('renderRivalryForLLM', () => {
  it('LG vs OB = 잠실 라이벌리 한 줄', () => {
    const s = renderRivalryForLLM('LG', 'OB');
    expect(s).not.toBeNull();
    expect(s).toContain('라이벌리');
  });

  it('양방향 동일 결과', () => {
    expect(renderRivalryForLLM('LG', 'OB')).toBe(renderRivalryForLLM('OB', 'LG'));
  });

  it('비-라이벌 = null', () => {
    expect(renderRivalryForLLM('LG', 'SS')).toBeNull();
    expect(renderRivalryForLLM('WO', 'KT')).toBeNull();
  });

  it('shared KBO_RIVALRIES 5쌍 모두 매칭', () => {
    for (const [a, b] of KBO_RIVALRIES) {
      expect(renderRivalryForLLM(a, b)).not.toBeNull();
    }
  });
});

describe('renderSeasonForLLM', () => {
  it('현재 시즌 단계 한 줄', () => {
    const s = renderSeasonForLLM(new Date('2026-06-19'));
    expect(s).toContain('시즌 중반');
    expect(s).toContain('mid');
    expect(s).toContain('2026-06');
  });
});

describe('renderTimeWindowsForLLM', () => {
  it('3 윈도우 모두 박제', () => {
    const s = renderTimeWindowsForLLM();
    expect(s).toContain('recent_form');
    expect(s).toContain('h2h_window');
    expect(s).toContain('season');
    expect(s).toContain('최근 10경기');
  });
});

describe('KBO_DOMAIN_KB', () => {
  it('parks / season_phases / time_windows / rivalries 4 layer 박제', () => {
    expect(KBO_DOMAIN_KB.parks).toBeDefined();
    expect(KBO_DOMAIN_KB.season_phases).toBeDefined();
    expect(KBO_DOMAIN_KB.time_windows).toBeDefined();
    expect(KBO_DOMAIN_KB.rivalries).toBeDefined();
  });

  it('rivalries source 단일 — shared KBO_RIVALRIES 동일 reference', () => {
    expect(KBO_DOMAIN_KB.rivalries).toBe(KBO_RIVALRIES);
  });

  it('frozen — 런타임 변경 차단', () => {
    expect(Object.isFrozen(KBO_DOMAIN_KB)).toBe(true);
  });
});
