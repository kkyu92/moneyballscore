import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  notifyAnnounce,
  notifyPredictions,
  notifyError,
  notifyPipelineStatus,
} from '../notify/telegram';
import type { ScrapedGame, PipelineResult } from '../types';

// sendMessage 내부에서 process.env 읽어 bot/chat 설정. 테스트 시 설정 강제.
const ORIGINAL_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ORIGINAL_CHAT = process.env.TELEGRAM_CHAT_ID;

function captureTelegramCalls() {
  const calls: Array<{ text: string; parseMode?: string }> = [];
  globalThis.fetch = vi.fn().mockImplementation(async (_url, init?: RequestInit) => {
    if (init?.body) {
      try {
        const parsed = JSON.parse(init.body as string);
        calls.push({ text: parsed.text, parseMode: parsed.parse_mode });
      } catch {}
    }
    return {
      ok: true, status: 200, statusText: 'OK',
      text: async () => '{"ok":true}',
    } as unknown as Response;
  });
  return calls;
}

function makeGame(overrides: Partial<ScrapedGame> = {}): ScrapedGame {
  return {
    date: '2026-04-22',
    homeTeam: 'OB',
    awayTeam: 'HT',
    gameTime: '18:30',
    stadium: '잠실',
    homeSP: '최승용',
    awaySP: '네일',
    status: 'scheduled',
    externalGameId: '20260422HTOB0',
    ...overrides,
  };
}

describe('notifyAnnounce', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHAT_ID = '12345';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = ORIGINAL_TOKEN;
    if (ORIGINAL_CHAT === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = ORIGINAL_CHAT;
    vi.restoreAllMocks();
  });

  it('편성 5경기 → 5줄 + 예상 시각 + 링크', async () => {
    const calls = captureTelegramCalls();
    const games = [
      makeGame({ gameTime: '14:00', externalGameId: 'a' }),
      makeGame({ gameTime: '14:00', homeTeam: 'LG', awayTeam: 'SS', externalGameId: 'b' }),
      makeGame({ gameTime: '17:00', homeTeam: 'LT', awayTeam: 'HH', externalGameId: 'c' }),
      makeGame({ gameTime: '18:30', homeTeam: 'WO', awayTeam: 'KT', externalGameId: 'd' }),
      makeGame({ gameTime: '18:30', homeTeam: 'SK', awayTeam: 'NC', externalGameId: 'e' }),
    ];

    await notifyAnnounce('2026-04-22', games, '16:00 KST 경');
    expect(calls).toHaveLength(1);

    const msg = calls[0].text;
    expect(msg).toContain('2026-04-22 KBO 오늘의 경기');
    expect(msg).toContain('편성 5경기');
    expect(msg).toContain('14:00');
    expect(msg).toContain('17:00');
    expect(msg).toContain('18:30');
    expect(msg).toContain('16:00 KST 경');
    expect(msg).toContain('moneyballscore.vercel.app');
  });

  it('편성 0경기 → "오늘 편성된 경기가 없습니다"', async () => {
    const calls = captureTelegramCalls();
    await notifyAnnounce('2026-04-21', [], '경기 없음');
    expect(calls).toHaveLength(1);
    expect(calls[0].text).toContain('오늘 편성된 경기가 없습니다');
    expect(calls[0].text).not.toContain('편성 0경기');
  });

  it('취소 1 + 정상 4 → "편성 5경기 (취소 1)" + 취소 표시 분리', async () => {
    const calls = captureTelegramCalls();
    const games = [
      makeGame({ externalGameId: 'a' }),
      makeGame({ externalGameId: 'b', homeTeam: 'LG', awayTeam: 'SS' }),
      makeGame({ externalGameId: 'c', homeTeam: 'LT', awayTeam: 'HH' }),
      makeGame({ externalGameId: 'd', homeTeam: 'WO', awayTeam: 'KT' }),
      makeGame({
        externalGameId: 'e', homeTeam: 'SK', awayTeam: 'NC',
        status: 'postponed',
      }),
    ];

    await notifyAnnounce('2026-04-22', games, '16:00 KST 경');
    const msg = calls[0].text;
    expect(msg).toContain('편성 5경기 (취소 1)');
    expect(msg).toContain('🚫');
    expect(msg).toContain('경기 취소');
    // 예측 알림 줄은 active 4경기 기준
    expect(msg).toContain('전체 4경기');
  });

  it('모두 취소 → 알림 줄 생략 (active=0)', async () => {
    const calls = captureTelegramCalls();
    const games = [
      makeGame({ externalGameId: 'a', status: 'postponed' }),
      makeGame({ externalGameId: 'b', status: 'postponed' }),
    ];

    await notifyAnnounce('2026-04-22', games, '경기 없음');
    const msg = calls[0].text;
    expect(msg).not.toContain('예측 알림');
  });

  it('TELEGRAM_BOT_TOKEN 없으면 조용히 skip', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const calls = captureTelegramCalls();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await notifyAnnounce('2026-04-22', [makeGame()], '16:00');
    expect(calls).toHaveLength(0);
  });
});

describe('notifyPredictions (regression)', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHAT_ID = '12345';
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = ORIGINAL_TOKEN;
    if (ORIGINAL_CHAT === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = ORIGINAL_CHAT;
    vi.restoreAllMocks();
  });

  it('기본 포맷: 날짜 + 경기/예측/스킵 + 승자 + 예측 승자 확률', async () => {
    const calls = captureTelegramCalls();
    const result: PipelineResult = {
      date: '2026-04-22',
      gamesFound: 5, predictionsGenerated: 5, gamesSkipped: 0, errors: [],
    };
    // hwp=0.45 → 원정 HT 승률 55% → 유력 🎯 (55%)
    const predictions = [
      {
        homeTeam: 'OB' as const, awayTeam: 'HT' as const,
        predictedWinner: 'HT' as const,
        confidence: 0.35, homeWinProb: 0.45,
      },
    ];

    await notifyPredictions(result, predictions);
    const msg = calls[0].text;
    expect(msg).toContain('2026-04-22 승부예측');
    expect(msg).toContain('경기 5개');
    expect(msg).toContain('예측 5개');
    expect(msg).toContain('55%'); // 승자(HT) 적중 확률
    expect(msg).toContain('🎯');
    expect(msg).toContain('유력');
  });

  it('승자 적중 확률 < 55% → 🤔 반반', async () => {
    const calls = captureTelegramCalls();
    const result: PipelineResult = {
      date: '2026-04-22',
      gamesFound: 1, predictionsGenerated: 1, gamesSkipped: 0, errors: [],
    };
    // hwp=0.52 → 홈 52% 승률 = 반반
    const predictions = [
      {
        homeTeam: 'OB' as const, awayTeam: 'HT' as const,
        predictedWinner: 'OB' as const,
        confidence: 0.5, homeWinProb: 0.52,
      },
    ];

    await notifyPredictions(result, predictions);
    const msg = calls[0].text;
    expect(msg).toContain('🤔');
    expect(msg).toContain('반반');
    expect(msg).toContain('52%');
  });

  it('승자 적중 확률 ≥ 65% → 🔥 적중', async () => {
    const calls = captureTelegramCalls();
    const result: PipelineResult = {
      date: '2026-04-22',
      gamesFound: 1, predictionsGenerated: 1, gamesSkipped: 0, errors: [],
    };
    // hwp=0.30 → 원정 HT 승률 70% = 적중
    const predictions = [
      {
        homeTeam: 'OB' as const, awayTeam: 'HT' as const,
        predictedWinner: 'HT' as const,
        confidence: 0.6, homeWinProb: 0.30,
      },
    ];

    await notifyPredictions(result, predictions);
    const msg = calls[0].text;
    expect(msg).toContain('🔥');
    expect(msg).toContain('적중');
    expect(msg).toContain('70%');
  });
});

describe('notifyError (regression)', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHAT_ID = '12345';
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = ORIGINAL_TOKEN;
    if (ORIGINAL_CHAT === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = ORIGINAL_CHAT;
    vi.restoreAllMocks();
  });

  it('context + error 메시지 포함', async () => {
    const calls = captureTelegramCalls();
    await notifyError('daily-pipeline GAP', '예측 누락 2경기');
    const msg = calls[0].text;
    expect(msg).toContain('🚨 MoneyBall 에러');
    expect(msg).toContain('daily-pipeline GAP');
    expect(msg).toContain('예측 누락 2경기');
  });
});

describe('notifyPipelineStatus (regression)', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHAT_ID = '12345';
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = ORIGINAL_TOKEN;
    if (ORIGINAL_CHAT === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = ORIGINAL_CHAT;
    vi.restoreAllMocks();
  });

  it('에러 없음 → "✅ 성공"', async () => {
    const calls = captureTelegramCalls();
    const result: PipelineResult = {
      date: '2026-04-22',
      gamesFound: 5, predictionsGenerated: 5, gamesSkipped: 0, errors: [],
    };
    await notifyPipelineStatus(result, 12_345);
    expect(calls[0].text).toContain('✅ 성공');
  });

  it('에러 있음 + 예측 있음 → "⚠️ 부분 성공"', async () => {
    const calls = captureTelegramCalls();
    const result: PipelineResult = {
      date: '2026-04-22',
      gamesFound: 5, predictionsGenerated: 3, gamesSkipped: 2,
      errors: ['Debate HTv OB: timeout'],
    };
    await notifyPipelineStatus(result, 45_678);
    expect(calls[0].text).toContain('⚠️ 부분 성공');
  });

  it('에러 있음 + 예측 0 → "❌ 실패"', async () => {
    const calls = captureTelegramCalls();
    const result: PipelineResult = {
      date: '2026-04-22',
      gamesFound: 5, predictionsGenerated: 0, gamesSkipped: 5,
      errors: ['FancyStats: ECONNREFUSED'],
    };
    await notifyPipelineStatus(result, 3_000);
    expect(calls[0].text).toContain('❌ 실패');
  });
});
