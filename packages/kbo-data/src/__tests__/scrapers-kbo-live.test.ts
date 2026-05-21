import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLiveGames } from '../scrapers/kbo-live';

function mockKboLive(payload: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => JSON.stringify(payload),
  } as unknown as Response);
}

function mockKboAndNaver(kboPayload: unknown, naverPayload: unknown) {
  globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
    if (typeof url === 'string' && url.includes('koreabaseball.com')) {
      return {
        ok: true, status: 200, statusText: 'OK',
        text: async () => JSON.stringify(kboPayload),
      } as unknown as Response;
    }
    return {
      ok: true, status: 200, statusText: 'OK',
      text: async () => JSON.stringify(naverPayload),
      json: async () => naverPayload,
    } as unknown as Response;
  });
}

describe('fetchLiveGames — status 매핑 회귀 (우천취소 silent drift 차단)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('CANCEL_SC_ID="1" → status=postponed (우천취소)', async () => {
    mockKboLive({
      game: [
        {
          G_ID: '20260520LTHH0',
          AWAY_ID: 'LT', HOME_ID: 'HH',
          AWAY_NM: '롯데', HOME_NM: '한화',
          GAME_STATE_SC: '1',
          CANCEL_SC_ID: '1',
          CANCEL_SC_NM: '우천취소',
          GAME_RESULT_CK: 0,
          T_SCORE_CN: null, B_SCORE_CN: null,
        },
      ],
    });
    const games = await fetchLiveGames('2026-05-20');
    expect(games).toHaveLength(1);
    expect(games[0].status).toBe('postponed');
    expect(games[0].homeTeam).toBe('HH');
    expect(games[0].awayTeam).toBe('LT');
  });

  it('CANCEL_SC_ID="2" → status=postponed (미세먼지/감염병 등)', async () => {
    mockKboLive({
      game: [
        {
          G_ID: '20260520NCOB0',
          AWAY_ID: 'OB', HOME_ID: 'NC',
          AWAY_NM: '두산', HOME_NM: 'NC',
          GAME_STATE_SC: '1',
          CANCEL_SC_ID: '2',
          GAME_RESULT_CK: 0,
        },
      ],
    });
    const games = await fetchLiveGames('2026-05-20');
    expect(games[0].status).toBe('postponed');
  });

  it('CANCEL_SC_ID 우선 — stateCode="3" + CANCEL_SC_ID="1" → postponed (취소 우선)', async () => {
    mockKboLive({
      game: [
        {
          G_ID: '20260520LGHT0',
          AWAY_ID: 'LG', HOME_ID: 'HT',
          AWAY_NM: 'LG', HOME_NM: 'KIA',
          GAME_STATE_SC: '3',
          CANCEL_SC_ID: '1',
          GAME_RESULT_CK: 1,
        },
      ],
    });
    const games = await fetchLiveGames('2026-05-20');
    expect(games[0].status).toBe('postponed');
  });

  it('CANCEL_SC_ID="0" + stateCode="2" → live (취소 아님)', async () => {
    mockKboLive({
      game: [
        {
          G_ID: '20260520WOSK0',
          AWAY_ID: 'WO', HOME_ID: 'SK',
          AWAY_NM: '키움', HOME_NM: 'SSG',
          GAME_STATE_SC: '2',
          CANCEL_SC_ID: '0',
          GAME_RESULT_CK: 0,
          GAME_INN_NO: 5,
          T_SCORE_CN: 3, B_SCORE_CN: 5,
        },
      ],
    });
    const games = await fetchLiveGames('2026-05-20');
    expect(games[0].status).toBe('live');
    expect(games[0].homeScore).toBe(5);
    expect(games[0].awayScore).toBe(3);
  });

  it('stateCode="3" + CANCEL_SC_ID 미존재 → final', async () => {
    mockKboLive({
      game: [
        {
          G_ID: '20260520WOSK0',
          AWAY_ID: 'WO', HOME_ID: 'SK',
          AWAY_NM: '키움', HOME_NM: 'SSG',
          GAME_STATE_SC: '3',
          GAME_RESULT_CK: 1,
          T_SCORE_CN: 3, B_SCORE_CN: 7,
        },
      ],
    });
    const games = await fetchLiveGames('2026-05-20');
    expect(games[0].status).toBe('final');
    expect(games[0].homeScore).toBe(7);
    expect(games[0].awayScore).toBe(3);
  });
});

describe('fetchLiveGames — KBO empty 시 Naver fallback (5/20 사례 드리프트)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('KBO rows=0 + Naver cancel=true → postponed', async () => {
    mockKboAndNaver(
      { game: [] },
      {
        code: 200, success: true,
        result: {
          games: [
            {
              gameId: '20260520LTHH02026',
              gameDate: '2026-05-20',
              gameDateTime: '2026-05-20T18:30:00',
              stadium: '대전',
              homeTeamCode: 'HH', homeTeamName: '한화',
              awayTeamCode: 'LT', awayTeamName: '롯데',
              homeTeamScore: 0, awayTeamScore: 0,
              statusCode: 'BEFORE', statusInfo: '경기취소',
              cancel: true, suspended: false,
            },
          ],
        },
      },
    );
    const games = await fetchLiveGames('2026-05-20');
    expect(games).toHaveLength(1);
    expect(games[0].status).toBe('postponed');
    expect(games[0].externalGameId).toBe('20260520LTHH0');
  });

  it('KBO rows=0 + Naver statusCode=RESULT → final + score', async () => {
    mockKboAndNaver(
      { game: [] },
      {
        code: 200, success: true,
        result: {
          games: [
            {
              gameId: '20260520WOSK02026',
              gameDate: '2026-05-20',
              gameDateTime: '2026-05-20T18:30:00',
              stadium: '문학',
              homeTeamCode: 'SK', homeTeamName: 'SSG',
              awayTeamCode: 'WO', awayTeamName: '키움',
              homeTeamScore: 7, awayTeamScore: 3,
              statusCode: 'RESULT', statusInfo: '경기종료',
              cancel: false, suspended: false,
            },
          ],
        },
      },
    );
    const games = await fetchLiveGames('2026-05-20');
    expect(games).toHaveLength(1);
    expect(games[0].status).toBe('final');
    expect(games[0].homeScore).toBe(7);
    expect(games[0].awayScore).toBe(3);
  });

  it('KBO rows=0 + Naver fail → 빈 배열 (live 파이프라인 막힘 차단)', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('koreabaseball.com')) {
        return {
          ok: true, status: 200, statusText: 'OK',
          text: async () => JSON.stringify({ game: [] }),
        } as unknown as Response;
      }
      return {
        ok: false, status: 502, statusText: 'Bad Gateway',
      } as unknown as Response;
    });
    const games = await fetchLiveGames('2026-05-20');
    expect(games).toHaveLength(0);
  });
});
