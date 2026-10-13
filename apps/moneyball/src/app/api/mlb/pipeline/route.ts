import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { errMsg, KST_OFFSET_MS } from '@moneyball/shared';
import { runMlbPipeline } from '@moneyball/kbo-data';
import type { MlbPipelineMode } from '@moneyball/kbo-data';

// Vercel Pro maxDuration (Plan C 정합)
export const maxDuration = 300;

const VALID_MODES: MlbPipelineMode[] = [
  'mlb_statsapi_scrape',
  'mlb_fancy_scrape',
  'mlb_savant_scrape',
  'mlb_predict_final',
  'mlb_shadow_train',
  'mlb_walk_forward_measure',
  'mlb_elo_update',
];

function todayKST(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  // CRON_SECRET 인증
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rawMode = body.mode as string | undefined;
  const rawDate = body.date as string | undefined;
  // pipeline_runs.triggered_by 는 VARCHAR(20) — 초과 시 supabase-js insert 가 throw
  // 없이 .error 리턴해 로그 자체가 silent 누락 (cycle 2078 발견). 경계에서 clamp.
  const triggeredBy = ((body.triggeredBy as string) || 'api').slice(0, 20);

  // mode 검증
  if (!rawMode || !VALID_MODES.includes(rawMode as MlbPipelineMode)) {
    return Response.json(
      {
        error: 'invalid mode',
        valid_modes: VALID_MODES,
        received: rawMode,
      },
      { status: 400 },
    );
  }

  const mode = rawMode as MlbPipelineMode;
  const date =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayKST();

  try {
    const result = await runMlbPipeline(mode, date, triggeredBy);

    // ISR revalidation 트리거 — KBO pipeline/route.ts 동일 패턴(predict_final 즉시 노출).
    //   누락 시 MLB_LIVE_ISR_SECONDS(1800초) 만료까지 최대 30분 신규 예측 미노출.
    //   revalidate 실패는 pipeline 본 작업의 성공을 가리면 안 됨 (silent false-failure 방지).
    if (mode === 'mlb_predict_final' && result.rows_inserted > 0) {
      try {
        const revalidateUrl = new URL('/api/revalidate', request.url);
        await fetch(revalidateUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({
            paths: ['/mlb', '/mlb/predictions', '/mlb/analysis', '/feed'],
          }),
        });
      } catch (revalidateError) {
        Sentry.captureException(revalidateError, {
          tags: { layer: 'api-route', route: 'mlb-pipeline', mode, sub: 'revalidate' },
        });
      }
    }

    return Response.json({ ok: true, result });
  } catch (e) {
    const message = errMsg(e);
    console.error('[MLB Pipeline API]', message);

    Sentry.captureException(e, {
      tags: { layer: 'api-route', route: 'mlb-pipeline', mode, triggered_by: triggeredBy },
      extra: { date, message },
    });

    return Response.json({ error: message }, { status: 500 });
  }
}
