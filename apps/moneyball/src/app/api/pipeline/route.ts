import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { errMsg } from '@moneyball/shared';
import { runDailyPipeline, notifyError } from '@moneyball/kbo-data';

// predict/predict_final 모드는 경기당 runDebate() LLM 호출(daily.ts) 루프를 돈다 —
// mlb/pipeline/route.ts 와 동일 작업 클래스(Plan C 정합)인데 maxDuration 미설정 상태였음
// (cycle 3531 review-code(heavy) 발견). 다경기일 default timeout 중도 절단 위험 방지.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  // CRON_SECRET 인증
  const authHeader = request.headers.get('authorization');
  // .trim() — 대시보드 값에 트레일링 개행이 섞이면 비교가 영구 실패 (동일 클래스
  // 버그 cycle 3217: LLM_BACKEND_HAIKU / INDEXNOW_KEY). 여기도 defensive 적용.
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rawDate = body.date as string | undefined;
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined;
  const validModes = ['announce', 'predict', 'predict_final', 'verify'] as const;
  type Mode = (typeof validModes)[number];
  const rawMode = body.mode as string | undefined;

  // mode 검증 — 미인식 mode 를 'predict' 로 silent fallback 하면 (구버전 동작)
  // 호출자 의도(예: verify)가 조용히 무시되고 엉뚱한 mode 가 성공 처리됨.
  // mlb/pipeline/route.ts 동일 패턴 (400 반환).
  if (!rawMode || !(validModes as readonly string[]).includes(rawMode)) {
    return Response.json(
      { error: 'invalid mode', valid_modes: validModes, received: rawMode },
      { status: 400 },
    );
  }
  const mode: Mode = rawMode as Mode;

  // pipeline_runs.triggered_by 는 VARCHAR(20) — 초과 시 supabase-js insert 가 throw
  // 없이 .error 리턴해 로그 자체가 silent 누락 (cycle 2078 발견). 경계에서 clamp.
  const triggeredBy = ((body.triggeredBy as string) || 'api').slice(0, 20) as
    | 'cron'
    | 'manual'
    | 'api';

  try {
    const result = await runDailyPipeline(date, mode, triggeredBy);

    // ISR revalidation 트리거. revalidate 실패는 pipeline 본 작업의 성공을
    //   가리면 안 됨 (silent false-failure 방지, sync-batter-stats 동일 패턴).
    //   predict/predict_final: 예측 생성 시 홈 + 예측 페이지
    //   verify: is_correct 업데이트 → /dashboard + /predictions + /analysis + /feed
    //   (CE/accuracy 통계·is_correct 직접 참조 페이지 전부 포함, predict 블록과 동일 커버리지)
    if (
      (mode === 'predict' || mode === 'predict_final') &&
      result.predictionsGenerated > 0
    ) {
      try {
        const revalidateUrl = new URL('/api/revalidate', request.url);
        await fetch(revalidateUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({
            paths: [
              '/',
              '/predictions',
              `/predictions/${result.date}`,
              '/analysis',
              '/feed',
            ],
          }),
        });
      } catch (revalidateError) {
        Sentry.captureException(revalidateError, {
          tags: { layer: 'api-route', route: 'pipeline', mode, sub: 'revalidate' },
        });
      }
    }

    if (mode === 'verify') {
      try {
        const revalidateUrl = new URL('/api/revalidate', request.url);
        await fetch(revalidateUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({
            paths: [
              '/dashboard',
              '/predictions',
              `/predictions/${result.date}`,
              '/',
              '/analysis',
              '/feed',
              '/accuracy',
            ],
          }),
        });
      } catch (revalidateError) {
        Sentry.captureException(revalidateError, {
          tags: { layer: 'api-route', route: 'pipeline', mode, sub: 'revalidate' },
        });
      }
    }

    return Response.json(result);
  } catch (e) {
    const message = errMsg(e);
    console.error('[Pipeline API]', message);

    Sentry.captureException(e, {
      tags: { layer: 'api-route', route: 'pipeline', mode, triggered_by: triggeredBy },
      extra: { date, message },
    });

    // 에러 알림
    try { await notifyError('Pipeline API', message); } catch {}

    return Response.json({ error: message }, { status: 500 });
  }
}
