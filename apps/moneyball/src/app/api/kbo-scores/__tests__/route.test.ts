// cycle 3403 — review-code(heavy): app/api/kbo-scores 테스트 공백 보강

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const captureExceptionMock = vi.fn();
const captureMessageMock = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
  captureMessage: (...args: unknown[]) => captureMessageMock(...args),
}));

vi.mock('@moneyball/shared', () => ({
  KBO_SCORES_FETCH_REVALIDATE_SECONDS: 30,
  KST_OFFSET_MS: 9 * 60 * 60 * 1000,
  NAVER_BROWSER_USER_AGENT: 'test-agent',
  NAVER_SPORTS_API_BASE: 'https://sports.naver.test/api/games',
}));

const fetchMock = vi.fn();

function makeRequest(date = '2026-10-20'): NextRequest {
  return new NextRequest(`http://localhost/api/kbo-scores?date=${date}`);
}

describe('GET /api/kbo-scores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('Naver API 정상 응답 → scores 매핑 반환 (kbo 아닌 카테고리 필터링)', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            games: [
              {
                categoryId: 'kbo',
                gameId: 'g1',
                homeTeamName: 'KIA',
                awayTeamName: '두산',
                homeTeamScore: 3,
                awayTeamScore: 1,
                statusCode: 'RESULT',
                statusInfo: '경기종료',
                stadium: '광주',
                gameDateTime: '2026-10-20T18:30:00+09:00',
              },
              { categoryId: 'kleague', gameId: 'g2' },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const { GET } = await import('../route');
    const resp = await GET(makeRequest());
    expect(resp.status).toBe(200);
    const json = await resp.json();
    expect(json.scores).toHaveLength(1);
    expect(json.scores[0]).toMatchObject({
      gameId: 'g1',
      homeTeam: 'HT',
      awayTeam: 'OB',
      status: 'final',
      stadium: '광주',
    });
  });

  it('cancel 플래그 true → postponed (statusInfo 텍스트와 무관하게 구조적 필드 우선)', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            games: [
              {
                categoryId: 'kbo',
                gameId: 'g3',
                homeTeamName: 'LG',
                awayTeamName: 'NC',
                statusCode: 'BEFORE',
                statusInfo: '경기전',
                cancel: true,
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const { GET } = await import('../route');
    const resp = await GET(makeRequest());
    const json = await resp.json();
    expect(json.scores[0].status).toBe('postponed');
  });

  it('suspended 플래그 true → postponed (cancel 과 동일 우선순위, statusInfo 텍스트와 무관)', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            games: [
              {
                categoryId: 'kbo',
                gameId: 'g4',
                homeTeamName: 'SSG',
                awayTeamName: 'KT',
                statusCode: 'DURING',
                statusInfo: '경기중',
                suspended: true,
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const { GET } = await import('../route');
    const resp = await GET(makeRequest());
    const json = await resp.json();
    expect(json.scores[0].status).toBe('postponed');
  });

  it('Naver API non-OK 응답 → 502 + Sentry warning', async () => {
    fetchMock.mockResolvedValue(new Response('error', { status: 503 }));
    const { GET } = await import('../route');
    const resp = await GET(makeRequest());
    expect(resp.status).toBe(502);
    expect(captureMessageMock).toHaveBeenCalledWith(
      'Naver API non-OK response',
      expect.objectContaining({ level: 'warning' }),
    );
  });

  it('fetch 자체 throw → 502 + Sentry captureException', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));
    const { GET } = await import('../route');
    const resp = await GET(makeRequest());
    expect(resp.status).toBe(502);
    const json = await resp.json();
    expect(json.error).toBe('Failed to fetch scores');
    expect(captureExceptionMock).toHaveBeenCalled();
  });
});
