/**
 * Moneyball Score — Cloudflare Cron Worker
 *
 * 두 가지 역할:
 *  1) Phase 1 — daily-pipeline 의 cron trigger (GH Actions schedule 대체).
 *     UTC hour → mode 결정 후 /api/pipeline 호출.
 *  2) Phase 2 — SP 확정 시각 측정 로깅. KBO 공식 + Naver 두 소스 동시 적재.
 *     매 trigger 마다 sp_confirmation_log 에 source='kbo-official' / 'naver'
 *     양쪽 row 삽입. 1주 데이터 누적 후 어느 쪽이 먼저 SP 채우는지 정량 비교.
 *
 * Phase 1 / Phase 2-KBO / Phase 2-Naver 세 작업 전부 독립 — 한쪽 실패해도 나머지 정상.
 */

export interface Env {
  PIPELINE_URL: string;
  CRON_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

type PipelineMode = 'announce' | 'predict' | 'predict_final' | 'verify';

function decideMode(scheduledTime: number): PipelineMode | null {
  const utcHour = new Date(scheduledTime).getUTCHours();
  if (utcHour === 0) return 'announce';
  if (utcHour >= 1 && utcHour <= 12) return 'predict';
  if (utcHour === 13) return 'predict_final';
  if (utcHour === 14) return 'verify';
  return null;
}

async function callPipeline(env: Env, mode: PipelineMode): Promise<void> {
  const resp = await fetch(env.PIPELINE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.CRON_SECRET}`,
    },
    body: JSON.stringify({ mode, triggeredBy: 'cron' }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    console.error(`[Worker] pipeline ${mode} failed: ${resp.status} ${body.slice(0, 300)}`);
    return;
  }
  console.log(`[Worker] pipeline ${mode} ok`);
}

interface SpLogRow {
  game_date: string;
  external_game_id: string;
  game_time: string | null;
  home_sp_name: string | null;
  away_sp_name: string | null;
  state_sc: string | null;
  inn_no: number | null;
  source: string;
}

async function insertSpRows(env: Env, rows: SpLogRow[], label: string): Promise<void> {
  if (rows.length === 0) return;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/sp_confirmation_log`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[Worker] sp_log ${label} insert ${res.status} ${body.slice(0, 200)}`);
    } else {
      console.log(`[Worker] sp_log ${label} inserted ${rows.length} rows`);
    }
  } catch (e) {
    console.error(`[Worker] sp_log ${label} fetch error:`, e);
  }
}

async function logKboSp(env: Env, todayKST: string): Promise<void> {
  const yyyymmdd = todayKST.replace(/-/g, '');

  let rawText: string;
  try {
    const apiResp = await fetch(
      'https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ leId: '1', srId: '0', date: yyyymmdd }),
      },
    );
    if (!apiResp.ok) {
      console.error(`[Worker] KBO API ${apiResp.status}`);
      return;
    }
    rawText = await apiResp.text();
  } catch (e) {
    console.error('[Worker] KBO fetch error:', e);
    return;
  }

  // KBO API 가 가끔 trailing 문자 붙여 보냄 — kbo-official.ts 와 동일 처리
  const jsonEnd = rawText.indexOf('}<') !== -1 ? rawText.indexOf('}<') + 1 : rawText.length;
  let json: unknown;
  try {
    json = JSON.parse(rawText.slice(0, jsonEnd));
  } catch {
    console.error('[Worker] KBO JSON parse error');
    return;
  }

  const j = json as { d?: string; game?: unknown[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawGames: any[] = [];
  if (j.d) {
    try { rawGames = JSON.parse(j.d); } catch { return; }
  } else if (Array.isArray(j.game)) {
    rawGames = j.game;
  } else {
    return;
  }

  const rows: SpLogRow[] = rawGames.map((raw) => ({
    game_date: todayKST,
    external_game_id: String(raw.G_ID ?? ''),
    game_time: raw.G_TM ?? null,
    home_sp_name: typeof raw.B_PIT_P_NM === 'string' ? raw.B_PIT_P_NM.trim() || null : null,
    away_sp_name: typeof raw.T_PIT_P_NM === 'string' ? raw.T_PIT_P_NM.trim() || null : null,
    state_sc: raw.GAME_STATE_SC != null ? String(raw.GAME_STATE_SC) : null,
    inn_no: typeof raw.GAME_INN_NO === 'number' ? raw.GAME_INN_NO : null,
    source: 'kbo-official',
  })).filter((r) => r.external_game_id);

  await insertSpRows(env, rows, 'kbo');
}

interface NaverGame {
  gameId?: string;
  gameDate?: string;
  gameDateTime?: string;
  homeStarterName?: string | null;
  awayStarterName?: string | null;
  statusCode?: string;
}

/**
 * Naver gameId (17자리, e.g. "20260428WOLT02026") → 13자리로 정규화하여 KBO
 * 공식 G_ID 와 join 가능하게 함. naver-schedule.ts 의 normalizeGameId 와 동일.
 */
function normalizeNaverGameId(id: string): string {
  return id.length === 17 ? id.slice(0, 13) : id;
}

async function logNaverSp(env: Env, todayKST: string): Promise<void> {
  const url =
    'https://api-gw.sports.naver.com/schedule/games' +
    '?fields=all&upperCategoryId=kbaseball&categoryId=kbo' +
    `&fromDate=${todayKST}&toDate=${todayKST}`;

  let json: { result?: { games?: NaverGame[] }; success?: boolean };
  try {
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) {
      console.error(`[Worker] Naver API ${resp.status}`);
      return;
    }
    json = await resp.json();
  } catch (e) {
    console.error('[Worker] Naver fetch error:', e);
    return;
  }

  if (!json.success) return;
  const games = json.result?.games ?? [];

  const rows: SpLogRow[] = games.map((g) => {
    // gameDateTime "2026-04-28T18:30:00" → "18:30"
    const m = g.gameDateTime?.match(/T(\d{2}):(\d{2})/);
    return {
      game_date: todayKST,
      external_game_id: normalizeNaverGameId(String(g.gameId ?? '')),
      game_time: m ? `${m[1]}:${m[2]}` : null,
      home_sp_name: g.homeStarterName?.trim() || null,
      away_sp_name: g.awayStarterName?.trim() || null,
      // Naver statusCode (BEFORE/STARTED/LIVE/RESULT) 를 KBO state_sc 와 동등 비교
      // 어렵게 만들지 않기 위해 raw 그대로 저장. 분석 시 source='naver' 분기로 처리.
      state_sc: g.statusCode ?? null,
      inn_no: null,
      source: 'naver',
    };
  }).filter((r) => r.external_game_id);

  await insertSpRows(env, rows, 'naver');
}

async function logSpConfirmation(env: Env): Promise<void> {
  const todayKST = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  await Promise.all([logKboSp(env, todayKST), logNaverSp(env, todayKST)]);
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const mode = decideMode(event.scheduledTime);

    // Phase 1 — 정의된 시간대만 pipeline trigger
    if (mode) {
      ctx.waitUntil(callPipeline(env, mode));
    } else {
      console.log(`[Worker] no mode for utcHour=${new Date(event.scheduledTime).getUTCHours()}, skipping pipeline`);
    }

    // Phase 2 — SP 측정은 mode 무관하게 매 trigger 적재
    ctx.waitUntil(logSpConfirmation(env));
  },

  // 헬스체크 / 수동 trigger 용 HTTP 엔드포인트
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return Response.json({ ok: true, ts: new Date().toISOString() });
    }
    if (url.pathname === '/sp-log' && request.method === 'POST') {
      // 수동 SP 로그 trigger (디버그)
      const auth = request.headers.get('authorization');
      if (auth !== `Bearer ${env.CRON_SECRET}`) {
        return new Response('unauthorized', { status: 401 });
      }
      await logSpConfirmation(env);
      return Response.json({ ok: true });
    }
    return new Response('moneyballscore-cron', { status: 200 });
  },
};
