/**
 * PLAN_v5 후속 — Naver 스케줄 스크래퍼 가드.
 *
 * fixture 는 실제 Naver API 프로덕션 응답 (2026-04-17 기준). 응답 스키마가
 * 변경되면 이 테스트가 먼저 붉어짐 → silent drift 방지.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  fetchNaverSchedule,
  parseNaverSchedule,
} from '../scrapers/naver-schedule';

function loadFixture(name: string): unknown {
  const path = join(__dirname, 'fixtures', name);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

describe('parseNaverSchedule', () => {
  it('2026-04-17 fixture — 5경기 (우천취소 3 + final 2)', () => {
    const fixture = loadFixture('naver-schedule-20260417.json');
    const games = parseNaverSchedule(fixture as never);

    expect(games).toHaveLength(5);

    const postponed = games.filter((g) => g.status === 'postponed');
    expect(postponed).toHaveLength(3);

    const finals = games.filter((g) => g.status === 'final');
    expect(finals).toHaveLength(2);
  });

  it('externalGameId 가 KBO 공식 13자리 포맷으로 정규화', () => {
    const fixture = loadFixture('naver-schedule-20260417.json');
    const games = parseNaverSchedule(fixture as never);

    for (const g of games) {
      expect(g.externalGameId).toMatch(/^\d{8}[A-Z]{4}\d$/);
      expect(g.externalGameId).toHaveLength(13);
    }
  });

  it('teamCode 가 KBO 10팀 중 하나로만 나옴 (2군 혼입 차단)', () => {
    const fixture = loadFixture('naver-schedule-20260417.json');
    const games = parseNaverSchedule(fixture as never);

    const valid = new Set(['SK', 'HT', 'LG', 'OB', 'KT', 'SS', 'LT', 'HH', 'NC', 'WO']);
    for (const g of games) {
      expect(valid.has(g.homeTeam)).toBe(true);
      expect(valid.has(g.awayTeam)).toBe(true);
    }
  });

  it('gameTime 이 HH:MM 형식', () => {
    const fixture = loadFixture('naver-schedule-20260417.json');
    const games = parseNaverSchedule(fixture as never);
    for (const g of games) {
      expect(g.gameTime).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('cancel=true 경기는 statusCode 무관하게 postponed', () => {
    const fixture = loadFixture('naver-schedule-20260417.json');
    const games = parseNaverSchedule(fixture as never);

    // 4/17 LT-HH, SS-LG, NC-SK 세 경기가 우천취소 (실제 prod 데이터 기준)
    const cancelled = games.filter((g) => g.status === 'postponed');
    const matchups = cancelled.map((g) => `${g.awayTeam}v${g.homeTeam}`).sort();
    expect(matchups).toEqual(['HHvLT', 'LGvSS', 'SKvNC'].sort());
  });

  it('fields=all fixture — SP 이름 + 이닝 점수 포함', () => {
    const fixture = loadFixture('naver-schedule-20260417.json');
    const games = parseNaverSchedule(fixture as never);
    // fields=all 로 받은 fixture 라 final 경기는 SP 확정
    const finalGames = games.filter((g) => g.status === 'final');
    for (const g of finalGames) {
      expect(g.homeSP).toBeTruthy();
      expect(g.awaySP).toBeTruthy();
    }
  });

  it('빈 응답 fixture → 빈 배열', () => {
    const fixture = loadFixture('naver-schedule-empty.json');
    const games = parseNaverSchedule(fixture as never);
    expect(games).toEqual([]);
  });

  it('invalid team code (2군 FS 같은 경기) 는 필터링', () => {
    const junk = {
      code: 200,
      success: true,
      result: {
        games: [
          // 정상
          {
            gameId: '20260420LGSS02026',
            gameDate: '2026-04-20',
            gameDateTime: '2026-04-20T18:30:00',
            stadium: '대구',
            homeTeamCode: 'SS',
            homeTeamName: '삼성',
            awayTeamCode: 'LG',
            awayTeamName: 'LG',
            homeTeamScore: 0,
            awayTeamScore: 0,
            statusCode: 'BEFORE',
            statusInfo: '경기전',
            cancel: false,
            suspended: false,
          },
          // 2군 가상 경기
          {
            gameId: '20260420FS2FS102026',
            gameDate: '2026-04-20',
            gameDateTime: '2026-04-20T13:00:00',
            stadium: '이천',
            homeTeamCode: 'FS1',
            homeTeamName: '2군팀',
            awayTeamCode: 'FS2',
            awayTeamName: '2군팀2',
            homeTeamScore: 0,
            awayTeamScore: 0,
            statusCode: 'BEFORE',
            statusInfo: '경기전',
            cancel: false,
            suspended: false,
          },
        ],
      },
    };
    const games = parseNaverSchedule(junk as never);
    expect(games).toHaveLength(1);
    expect(games[0].homeTeam).toBe('SS');
  });
});

describe('fetchNaverSchedule (network mock)', () => {
  const ORIGINAL_FETCH = globalThis.fetch;

  beforeEach(() => {
    const fixture = loadFixture('naver-schedule-20260417.json');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => fixture,
    } as unknown as Response);
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('URL 에 fromDate/toDate + upperCategoryId=kbaseball 포함', async () => {
    await fetchNaverSchedule('2026-04-17', '2026-04-17', 'basic');
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call[0] as string;
    expect(url).toContain('fromDate=2026-04-17');
    expect(url).toContain('toDate=2026-04-17');
    expect(url).toContain('upperCategoryId=kbaseball');
    expect(url).toContain('categoryId=kbo');
    expect(url).toContain('fields=basic');
  });

  it('fields=all 파라미터 전달', async () => {
    await fetchNaverSchedule('2026-04-17', '2026-04-17', 'all');
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('fields=all');
  });

  it('HTTP 500 → throw', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 500, statusText: 'Internal Error',
      json: async () => ({}),
    } as unknown as Response);
    await expect(fetchNaverSchedule('2026-04-17', '2026-04-17'))
      .rejects.toThrow(/Naver schedule API error/);
  });

  it('success=false → throw', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK',
      json: async () => ({ code: 400, success: false, result: null }),
    } as unknown as Response);
    await expect(fetchNaverSchedule('2026-04-17', '2026-04-17'))
      .rejects.toThrow(/unsuccessful/);
  });
});
