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
  'mlb_combined_notify',
  'mlb_shadow_train',
  'mlb_walk_forward_measure',
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
  const triggeredBy = (body.triggeredBy as string) || 'api';

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
