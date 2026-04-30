/**
 * Moneyball Score — Cloudflare Cron Worker
 *
 * 일곱 가지 역할 (event.cron 분기):
 *  1) "17 0-14 * * *" — daily-pipeline cron trigger.
 *     UTC hour → mode 결정 후 /api/pipeline 호출.
 *  2) "17 0-14 * * *" 동시 — SP 확정 시각 측정 (KBO 공식 + Naver 두 소스).
 *     매 trigger 마다 sp_confirmation_log 양쪽 row 삽입.
 *  3) "37 * * * *" — sitemap-warmup. /sitemap.xml + /robots.txt GET 으로 ISR warm.
 *  4) live-update — KST 18:00~00:50 매 10분 /api/live POST (cron expression
 *     은 wrangler.toml 참조; JSDoc 안에 그대로 쓰면 주석 종료로 파싱됨).
 *  5) "0 0 * * *" — self-develop daily fire (KST 09:00). GitHub
 *     workflow_dispatch 로 self-develop.yml 호출 → self-hosted [home]
 *     runner 위 claude-code-action 진단/결정/실행.
 *  6) "17 0-14 * * *" UTC 03:17 조건 — 타자 스탯 일 1회 동기화 (KST 12:17).
 *     /api/sync-batter-stats POST. 예측(KST 15:17) 3시간 전 선행.
 *     별도 cron slot 소비 없이 기존 cron 재사용.
 *  7) "37 * * * *" 중 UTC 토요일 15시 — pitcher-snapshot (KST 일요일 00:37).
 *     /api/snapshot-pitchers POST → pitcher_stats 주간 시점 snapshot.
 *     cron 슬롯 추가 없이 sitemap-warmup 분기 안에 조건 통합 (4/5 유지).
 *
 * 모든 작업 독립 — 한쪽 실패해도 나머지 정상.
 */

export interface Env {
  PIPELINE_URL: string;
  SITE_URL: string;
  CRON_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  GH_DISPATCH_PAT: string;
  GH_REPO: string;
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

async function runSitemapWarmup(env: Env): Promise<void> {
  const headers = { 'User-Agent': 'moneyball-sitemap-warmup/1.0' };
  // GET (HEAD 는 CDN cache-miss 재검증 강제 못 함). 바디 버림.
  try {
    const resp = await fetch(`${env.SITE_URL}/sitemap.xml`, { headers });
    console.log(`[Worker] sitemap warmup status=${resp.status}`);
  } catch (e) {
    console.error('[Worker] sitemap warmup error:', e);
  }
  try {
    const resp = await fetch(`${env.SITE_URL}/robots.txt`, { headers });
    console.log(`[Worker] robots warmup status=${resp.status}`);
  } catch (e) {
    console.error('[Worker] robots warmup error:', e);
  }
}

async function runLiveUpdate(env: Env): Promise<void> {
  try {
    const resp = await fetch(`${env.SITE_URL}/api/live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.CRON_SECRET}`,
      },
      body: '{}',
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error(`[Worker] live-update failed: ${resp.status} ${body.slice(0, 200)}`);
      return;
    }
    const data = (await resp.json().catch(() => ({}))) as { liveGames?: number };
    console.log(`[Worker] live-update ok: liveGames=${data.liveGames ?? '?'}`);
  } catch (e) {
    console.error('[Worker] live-update error:', e);
  }
}

async function runBatterSync(env: Env): Promise<void> {
  try {
    const resp = await fetch(`${env.SITE_URL}/api/sync-batter-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.CRON_SECRET}`,
      },
      body: '{}',
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error(`[Worker] batter-sync failed: ${resp.status} ${body.slice(0, 200)}`);
      return;
    }
    const data = (await resp.json().catch(() => ({}))) as { upsertedStats?: number };
    console.log(`[Worker] batter-sync ok: upserted=${data.upsertedStats ?? '?'}`);
  } catch (e) {
    console.error('[Worker] batter-sync error:', e);
  }
}

async function runPitcherSnapshot(env: Env): Promise<void> {
  try {
    const resp = await fetch(`${env.SITE_URL}/api/snapshot-pitchers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.CRON_SECRET}`,
      },
      body: '{}',
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error(`[Worker] pitcher-snapshot failed: ${resp.status} ${body.slice(0, 200)}`);
      return;
    }
    const data = (await resp.json().catch(() => ({}))) as { upserted?: number };
    console.log(`[Worker] pitcher-snapshot ok: upserted=${data.upserted ?? '?'}`);
  } catch (e) {
    console.error('[Worker] pitcher-snapshot error:', e);
  }
}

async function dispatchSelfDevelop(env: Env): Promise<void> {
  // env.GH_REPO 형식: "kkyu92/moneyballscore". PAT scope = actions:write.
  const url = `https://api.github.com/repos/${env.GH_REPO}/actions/workflows/self-develop.yml/dispatches`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GH_DISPATCH_PAT}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'moneyballscore-cron/self-develop',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error(`[Worker] self-develop dispatch failed: ${resp.status} ${body.slice(0, 300)}`);
      return;
    }
    console.log('[Worker] self-develop dispatch ok');
  } catch (e) {
    console.error('[Worker] self-develop dispatch error:', e);
  }
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const cronExpr = event.cron;

    if (cronExpr === '17 0-14 * * *') {
      // daily-pipeline + SP 측정
      const mode = decideMode(event.scheduledTime);
      if (mode) {
        ctx.waitUntil(callPipeline(env, mode));
      } else {
        console.log(`[Worker] no mode for utcHour=${new Date(event.scheduledTime).getUTCHours()}, skipping pipeline`);
      }
      ctx.waitUntil(logSpConfirmation(env));
      // UTC 03:17 (KST 12:17) — 타자 스탯 일 1회 동기화 (예측 3시간 전)
      if (new Date(event.scheduledTime).getUTCHours() === 3) {
        ctx.waitUntil(runBatterSync(env));
      }
    } else if (cronExpr === '37 * * * *') {
      ctx.waitUntil(runSitemapWarmup(env));
      // UTC 토요일 15:37 ≈ KST 일요일 00:37 — 주간 pitcher-snapshot (기존 GH cron 대체)
      const d = new Date(event.scheduledTime);
      if (d.getUTCDay() === 6 && d.getUTCHours() === 15) {
        ctx.waitUntil(runPitcherSnapshot(env));
      }
    } else if (cronExpr === '*/10 9-15 * * *') {
      ctx.waitUntil(runLiveUpdate(env));
    } else if (cronExpr === '17 3 * * *' || cronExpr === '0 0 * * *') {
      // '17 3 * * *' (KST 12:17) = 4/30 09:00 miss 만회용 임시. 4/30 KST 18:00 이후 '0 0 * * *' (KST 09:00) 로 복귀.
      ctx.waitUntil(dispatchSelfDevelop(env));
    } else {
      console.log(`[Worker] unknown cron: ${cronExpr}`);
    }
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
