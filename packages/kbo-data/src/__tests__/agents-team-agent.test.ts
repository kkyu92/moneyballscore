import { describe, it, expect } from 'vitest';
import { buildUserMessage } from '../agents/team-agent';
import type { GameContext } from '../agents/types';

function makeContext(): GameContext {
  return {
    game: {
      date: '2026-04-15',
      homeTeam: 'LG',
      awayTeam: 'OB',
      gameTime: '18:30',
      stadium: '잠실',
      homeSP: '임찬규',
      awaySP: '곽빈',
      status: 'scheduled',
      externalGameId: 'KBOG20260415LGT0',
    },
    homeSPStats: { name: '임찬규', team: 'LG', fip: 3.2, xfip: 3.5, era: 3.1, innings: 85, war: 2.5, kPer9: 8.5 },
    awaySPStats: { name: '곽빈', team: 'OB', fip: 4.1, xfip: 4.3, era: 4.2, innings: 70, war: 1.2, kPer9: 6.8 },
    homeTeamStats: { team: 'LG', woba: 0.34, bullpenFip: 3.8, totalWar: 18.5, sfr: 2.5 },
    awayTeamStats: { team: 'OB', woba: 0.32, bullpenFip: 4.2, totalWar: 15.0, sfr: -1.0 },
    homeElo: { team: 'LG', elo: 1550, winPct: 0.58 },
    awayElo: { team: 'OB', elo: 1480, winPct: 0.48 },
    headToHead: { wins: 7, losses: 5 },
    homeRecentForm: 0.7,
    awayRecentForm: 0.4,
    parkFactor: 1.02,
  };
}

describe('buildUserMessage (v4-3 Task 2 rivalry 주입)', () => {
  it('rivalryBlock undefined — 기존 동작 유지 (과거 맥락 섹션 없음)', () => {
    const msg = buildUserMessage('LG', makeContext());
    expect(msg).not.toContain('과거 맥락');
    expect(msg).toContain('LG');
    expect(msg).toContain('상대 전적');
  });

  it('rivalryBlock 빈 문자열 — 과거 맥락 섹션 생략 (빈 헤더 방지)', () => {
    const msg = buildUserMessage('LG', makeContext(), '');
    expect(msg).not.toContain('과거 맥락');
  });

  it('rivalryBlock 공백만 — 과거 맥락 섹션 생략', () => {
    const msg = buildUserMessage('LG', makeContext(), '   \n  ');
    expect(msg).not.toContain('과거 맥락');
  });

  it('rivalryBlock 정상 — 주입됨', () => {
    const block = '## 과거 맥락\n최근 상대전적: LG 3승 2패';
    const msg = buildUserMessage('LG', makeContext(), block);
    expect(msg).toContain('과거 맥락');
    expect(msg).toContain('3승 2패');
    expect(msg).toContain('파크팩터');
    // rivalry 블록이 파크팩터 이후에 위치
    expect(msg.indexOf('과거 맥락')).toBeGreaterThan(msg.indexOf('파크팩터'));
  });

  it('away team 관점 — rivalry 주입 동일하게 동작', () => {
    const block = '## 과거 맥락\nOB 2승 3패';
    const msg = buildUserMessage('OB', makeContext(), block);
    expect(msg).toContain('두산'); // OB = 두산
    expect(msg).toContain('과거 맥락');
  });
});

describe('buildUserMessage (plan #23 Step 5 wave 44 context layer 통합)', () => {
  it('context block prepended — production metric + 도메인 hint 박제', () => {
    const msg = buildUserMessage('LG', makeContext());
    expect(msg).toContain('[경기]');
    expect(msg).toContain('[도메인 컨텍스트]');
    expect(msg).toContain('[정량 메트릭 — 10팩터]');
    expect(msg).toContain('[상대 전적 + 최근 폼]');
  });

  it('context block 안 metric 측정치 박제 — sp_fip / lineup_woba / elo', () => {
    const msg = buildUserMessage('LG', makeContext());
    expect(msg).toContain('선발 FIP');
    expect(msg).toContain('타선 wOBA');
    expect(msg).toContain('Elo');
  });

  it('context block 이 기존 inline 데이터보다 먼저 박제', () => {
    const msg = buildUserMessage('LG', makeContext());
    expect(msg.indexOf('[경기]')).toBeLessThan(msg.indexOf('오늘 경기'));
  });
});

describe('buildUserMessage — WAR/SFR 데이터 갭 sentinel(0) 마스킹 (cycle 2428, silent drift family)', () => {
  it('homeTeamStats.totalWar=0 (Fancy Stats top-50 limit gap) — raw 0 대신 갭 표기', () => {
    const ctx = makeContext();
    ctx.homeTeamStats.totalWar = 0;
    const msg = buildUserMessage('LG', ctx);
    expect(msg).toContain('WAR: 데이터 없음(집계 갭)');
    expect(msg).not.toMatch(/WAR: 0(?!\.\d)/);
  });

  it('awayTeamStats.sfr=0 (fetchEloRatings silent-fallback stub) — raw 0 대신 갭 표기', () => {
    const ctx = makeContext();
    ctx.awayTeamStats.sfr = 0;
    const msg = buildUserMessage('LG', ctx);
    expect(msg).toContain('수비 SFR: 데이터 없음(집계 갭)');
  });

  it('WAR/SFR 정상값(0 아님) — 기존처럼 raw 숫자 그대로 노출', () => {
    const msg = buildUserMessage('LG', makeContext());
    expect(msg).toContain('WAR: 18.5');
    expect(msg).toContain('수비 SFR: 2.5');
  });
});
