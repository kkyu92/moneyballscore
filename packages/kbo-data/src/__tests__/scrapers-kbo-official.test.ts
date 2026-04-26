import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchGames } from '../scrapers/kbo-official';
import weekendMixed from './fixtures/kbo-api/weekend-mixed.json';
import rainCancellation from './fixtures/kbo-api/rain-cancellation.json';
import allFinished from './fixtures/kbo-api/all-finished.json';
import scheduledNormal from './fixtures/kbo-api/scheduled-normal.json';
import spUnconfirmed from './fixtures/kbo-api/sp-unconfirmed.json';

function mockKboApi(payload: unknown) {
  const text = JSON.stringify(payload);
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => text,
  } as unknown as Response);
}

describe('fetchGames — status 파싱 regression 보호 (PLAN_v5 Phase 4)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('weekend-mixed: 14:00/14:00/17:00/18:30/18:30 혼재', () => {
    it('5경기 전부 파싱', async () => {
      mockKboApi(weekendMixed);
      const games = await fetchGames('2026-04-18');
      expect(games).toHaveLength(5);
    });

    it('status 분포: final 1 + live 1 + scheduled 3', async () => {
      mockKboApi(weekendMixed);
      const games = await fetchGames('2026-04-18');
      const statuses = games.map((g) => g.status).sort();
      expect(statuses).toEqual(['final', 'live', 'scheduled', 'scheduled', 'scheduled']);
    });

    it('final 경기는 점수 포함 (T_SCORE_CN=away, B_SCORE_CN=home)', async () => {
      mockKboApi(weekendMixed);
      const games = await fetchGames('2026-04-18');
      const finalGame = games.find((g) => g.status === 'final');
      expect(finalGame).toBeDefined();
      expect(finalGame!.awayScore).toBe(2);
      expect(finalGame!.homeScore).toBe(7);
    });

    it('scheduled 경기는 점수 undefined', async () => {
      mockKboApi(weekendMixed);
      const games = await fetchGames('2026-04-18');
      const scheduled = games.filter((g) => g.status === 'scheduled');
      for (const g of scheduled) {
        expect(g.homeScore).toBeUndefined();
        expect(g.awayScore).toBeUndefined();
      }
    });

    it('낮경기 14:00 + 저녁경기 18:30 정상 파싱', async () => {
      mockKboApi(weekendMixed);
      const games = await fetchGames('2026-04-18');
      const times = games.map((g) => g.gameTime).sort();
      expect(times).toEqual(['14:00', '14:00', '17:00', '18:30', '18:30']);
    });
  });

  describe('rain-cancellation: 1 취소 + 4 scheduled', () => {
    it('5경기 전부 파싱 (취소 포함)', async () => {
      mockKboApi(rainCancellation);
      const games = await fetchGames('2026-04-17');
      expect(games).toHaveLength(5);
    });

    it('취소 경기는 status=postponed', async () => {
      mockKboApi(rainCancellation);
      const games = await fetchGames('2026-04-17');
      const postponed = games.filter((g) => g.status === 'postponed');
      expect(postponed).toHaveLength(1);
      expect(postponed[0].homeTeam).toBe('LT');
      expect(postponed[0].awayTeam).toBe('HH');
    });

    it('나머지 4경기는 scheduled', async () => {
      mockKboApi(rainCancellation);
      const games = await fetchGames('2026-04-17');
      const scheduled = games.filter((g) => g.status === 'scheduled');
      expect(scheduled).toHaveLength(4);
    });
  });

  describe('all-finished: 5경기 모두 종료', () => {
    it('status 전부 final', async () => {
      mockKboApi(allFinished);
      const games = await fetchGames('2026-04-16');
      expect(games).toHaveLength(5);
      for (const g of games) {
        expect(g.status).toBe('final');
      }
    });

    it('모든 경기 점수 설정됨', async () => {
      mockKboApi(allFinished);
      const games = await fetchGames('2026-04-16');
      for (const g of games) {
        expect(g.homeScore).toBeTypeOf('number');
        expect(g.awayScore).toBeTypeOf('number');
      }
    });
  });

  describe('scheduled-normal: 평일 전경기 18:30', () => {
    it('5경기 전부 scheduled + 18:30', async () => {
      mockKboApi(scheduledNormal);
      const games = await fetchGames('2026-04-22');
      expect(games).toHaveLength(5);
      for (const g of games) {
        expect(g.status).toBe('scheduled');
        expect(g.gameTime).toBe('18:30');
        expect(g.homeSP).toBeDefined();
        expect(g.awaySP).toBeDefined();
      }
    });
  });

  describe('sp-unconfirmed: 일부 선발 미확정', () => {
    it('5경기 전부 파싱 (SP 미확정 포함)', async () => {
      mockKboApi(spUnconfirmed);
      const games = await fetchGames('2026-04-23');
      expect(games).toHaveLength(5);
    });

    it('T_PIT_P_NM="" 인 경기는 awaySP undefined', async () => {
      mockKboApi(spUnconfirmed);
      const games = await fetchGames('2026-04-23');
      const noPitcher = games.filter(
        (g) => !g.awaySP || !g.homeSP,
      );
      expect(noPitcher).toHaveLength(2); // fixture 정의상 2경기
    });

    it('모든 경기 status=scheduled (SP 미확정이어도 status 는 독립)', async () => {
      mockKboApi(spUnconfirmed);
      const games = await fetchGames('2026-04-23');
      for (const g of games) {
        expect(g.status).toBe('scheduled');
      }
    });
  });

  describe('regression: state_sc=1 + inn_no=1 (2026-04-26 prod)', () => {
    // 4/26 LG@OB / KT@SK 두 경기가 시작 1시간 전 cron 에서
    // KBO API 응답 GAME_STATE_SC="1" 인데 GAME_INN_NO=1 으로 미리 set 되어
    // 'live' 오판정 → shouldPredictGame 이 not_scheduled 로 reject 한 사고.
    // GAME_INN_NO 는 라이브 판정에서 제외되어야 한다.
    function rawWith(stateSc: string, innNo: number) {
      return {
        d: JSON.stringify([
          {
            G_ID: '20260426LGOB0',
            G_DT: '20260426',
            G_TM: '14:00',
            S_NM: '잠실',
            HOME_ID: 'OB',
            AWAY_ID: 'LG',
            HOME_NM: '두산',
            AWAY_NM: 'LG',
            B_PIT_P_NM: '곽빈',
            T_PIT_P_NM: '에르난데스',
            GAME_STATE_SC: stateSc,
            GAME_INN_NO: innNo,
            CANCEL_SC_ID: '0',
            CANCEL_SC_NM: '정상경기',
            GAME_RESULT_CK: 0,
          },
        ]),
      };
    }

    it('state_sc=1 + inn_no=1 → scheduled (라이브 아님)', async () => {
      mockKboApi(rawWith('1', 1));
      const games = await fetchGames('2026-04-26');
      expect(games).toHaveLength(1);
      expect(games[0].status).toBe('scheduled');
    });

    it('state_sc=1 + inn_no=0 → scheduled', async () => {
      mockKboApi(rawWith('1', 0));
      const games = await fetchGames('2026-04-26');
      expect(games[0].status).toBe('scheduled');
    });

    it('state_sc=2 + inn_no=1 → live', async () => {
      mockKboApi(rawWith('2', 1));
      const games = await fetchGames('2026-04-26');
      expect(games[0].status).toBe('live');
    });

    it('state_sc=3 → final (inn_no 무관)', async () => {
      mockKboApi(rawWith('3', 9));
      const games = await fetchGames('2026-04-26');
      expect(games[0].status).toBe('final');
    });
  });

  describe('externalGameId + 팀 코드 매핑', () => {
    it('weekend-mixed: G_ID 가 externalGameId 로 유지', async () => {
      mockKboApi(weekendMixed);
      const games = await fetchGames('2026-04-18');
      const ids = games.map((g) => g.externalGameId).sort();
      expect(ids).toContain('20260418LGSS0');
      expect(ids).toContain('20260418HTOB0');
    });

    it('HOME_ID/AWAY_ID 는 TeamCode 로 직접 매핑', async () => {
      mockKboApi(scheduledNormal);
      const games = await fetchGames('2026-04-22');
      const teams = new Set<string>();
      for (const g of games) {
        teams.add(g.homeTeam);
        teams.add(g.awayTeam);
      }
      // 5경기 × 2팀 = 10팀 KBO 전부 등장 기대
      expect(teams.size).toBe(10);
    });
  });
});
