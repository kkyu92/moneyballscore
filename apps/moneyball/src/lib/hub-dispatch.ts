/**
 * Playbook 허브로 L3 에러·사고·lesson 을 전송하는 공통 payload 빌더.
 *
 * 세 소스 모두 동일 schema 로 허브 `auto-ingest.yml` 을 호출:
 *   1. Sentry webhook (앱 런타임 에러) — `/api/hub-dispatch` 가 이 모듈 사용
 *   2. CI 실패 (workflow_run) — GitHub Action composite 가 bash 로 재현
 *   3. Cron 실패 (workflow 내 if: failure()) — 동일 bash 재현
 *
 * 허브 dedup 은 `fingerprint` 기반 (24h 동일 fp = 재발 코멘트). 워커는 N 카운팅
 * 하지 않음 — Sentry alert rule rate limit 으로 원천 제어.
 *
 * PII 방어 심층화: Sentry `beforeSend` 에서 1차 스크럽된 payload 가 `/api/
 * hub-dispatch` 에 도달 → 여기서 2차 재스크럽 (email/token/UUID).
 */

/**
 * 허브 `auto-ingest.yml` 이 읽는 client_payload 필수/선택 필드.
 * 변경 시 hub 쪽도 동기화 필요.
 */
export interface HubDispatchPayload {
  /** 워커 레포 (`owner/repo`). */
  source_repo: string;
  /** Issue 제목 재료 (허브가 앞에 "🟡 Inbound raw:" 같은 prefix 붙임). */
  title: string;
  /** Issue body / raw-sources frontmatter 하부 내용. Markdown. */
  body: string;
  /** 허브 분기: error-log / incident / lesson. */
  type: 'error-log' | 'incident' | 'lesson';
  /** incident 전용. warning / error / critical. */
  severity?: 'warning' | 'error' | 'critical';
  /** 안정 식별자 — 허브 dedup 의 key. */
  fingerprint: string;
  /** 발생 환경 — production / staging / preview. */
  environment?: string;
  /** 로그·스택트레이스·Sentry 이슈 URL. */
  run_url?: string;
  /** 처음 관측된 시각 (ISO 8601). */
  first_seen?: string;
  /** `test` 면 허브가 raw 만 저장하고 Issue/Journal 생략 — 가드 테스트. */
  intent?: 'test';
}

/** repository_dispatch event_type (허브 auto-ingest 구독 키). */
export type HubEventType = 'worker-error' | 'worker-incident' | 'worker-lesson';

/** type → event_type 매핑. */
export function mapEventType(type: HubDispatchPayload['type']): HubEventType {
  switch (type) {
    case 'incident':
      return 'worker-incident';
    case 'lesson':
      return 'worker-lesson';
    default:
      return 'worker-error';
  }
}

/**
 * 문자열 배열 → 안정 fingerprint slug.
 *   - 소문자 + 영숫자/하이픈 외 치환
 *   - 연속 하이픈 축약 + 양끝 trim
 *   - 최대 60자
 * 결정론적 — 동일 입력 → 동일 출력 (bash/TS 알고리즘 일치 필수).
 */
export function makeFingerprint(keys: readonly string[]): string {
  const joined = keys
    .filter(Boolean)
    .map((k) => k.trim())
    .join('-');
  const slug = joined
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.slice(0, 60) || 'unknown';
}

/**
 * PII / secret 패턴 스크럽. Sentry beforeSend 에서 1차 수행된 값이 와도
 * 재차 방어 심층화. 정규식 목록은 보수적 — false positive 를 감수하고 민감
 * 데이터 유출 차단.
 */
const PII_PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  // Email
  {
    re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[email]',
  },
  // Bearer / JWT-like
  { re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, replacement: '[jwt]' },
  // sk_* / pk_* / tok_* / api_* / sk_live_* 식 토큰 (Stripe 스타일 포함)
  { re: /\b(?:sk|pk|tok|api|key)_[A-Za-z0-9_]{16,}/g, replacement: '[token]' },
  // GitHub PAT (ghp_/gho_/ghu_/ghs_/ghr_)
  { re: /\bgh[porus]_[A-Za-z0-9]{20,}/g, replacement: '[github-pat]' },
  // UUID v4 — 유저 식별자 가능성
  {
    re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    replacement: '[uuid]',
  },
  // 20자+ 16진수 — API 키·세션 토큰 패턴
  { re: /\b[0-9a-f]{32,}\b/gi, replacement: '[hex]' },
];

export function scrubPII(text: string): string {
  let out = text;
  for (const { re, replacement } of PII_PATTERNS) {
    out = out.replace(re, replacement);
  }
  return out;
}

/**
 * Sentry event level → 허브 severity. 누락·알 수 없음은 warning fallback.
 */
export function mapSeverity(
  sentryLevel: string | null | undefined,
): HubDispatchPayload['severity'] {
  switch (sentryLevel) {
    case 'fatal':
      return 'critical';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'warning';
  }
}

/**
 * Sentry webhook payload (`issue.alert` / `event.alert`) 의 최소 요구 필드.
 * 실제 Sentry payload 는 훨씬 크지만 여기서 필요한 것만 나열.
 */
export interface SentryWebhookInput {
  event: {
    event_id?: string;
    level?: string;
    title?: string;
    message?: string;
    culprit?: string;
    environment?: string;
    release?: string;
    timestamp?: string | number;
    exception?: {
      values?: Array<{
        type?: string;
        value?: string;
        stacktrace?: {
          frames?: Array<{
            filename?: string;
            function?: string;
            lineno?: number;
          }>;
        };
      }>;
    };
    request?: { url?: string; headers?: Record<string, string> };
    tags?: Array<[string, string]>;
    web_url?: string;
  };
  triggered_rule?: string;
  installation?: { uuid?: string };
}

/** Sentry exception top-1 stack frame → "file:line in function" 줄 배열. */
function formatStack(exc: SentryWebhookInput['event']['exception']): string[] {
  const frames = exc?.values?.[0]?.stacktrace?.frames ?? [];
  // Sentry 는 가장 바깥 frame 이 배열 끝 (역순). 최근 5 프레임만.
  const top = [...frames].reverse().slice(0, 5);
  return top.map((f) => {
    const loc = f.filename ? `${f.filename}:${f.lineno ?? '?'}` : '<unknown>';
    const fn = f.function ?? '<anon>';
    return `  at ${fn} (${loc})`;
  });
}

/**
 * Sentry webhook → 허브 HubDispatchPayload 변환.
 * PII scrub 은 여기서 완료 (호출자가 다시 할 필요 없음).
 *
 * fingerprint 구성:
 *   ['sentry', exception.type || level, top-frame file:line, environment]
 * release 는 포함 안 함 — 같은 버그 여러 release 재발을 같은 Issue 로 모으는게
 * 원하는 동작.
 */
export function composePayload(
  input: SentryWebhookInput,
  opts: { sourceRepo: string; intent?: 'test' } = { sourceRepo: '' },
): HubDispatchPayload {
  const e = input.event;
  const exc = e.exception?.values?.[0];
  const excType = exc?.type ?? 'Error';
  const excValue = exc?.value ?? e.message ?? e.title ?? 'Unknown error';

  const topFrame = e.exception?.values?.[0]?.stacktrace?.frames?.slice(-1)[0];
  const fingerprintKeys = [
    'sentry',
    excType,
    topFrame?.filename
      ? `${topFrame.filename}:${topFrame.lineno ?? 0}`
      : e.culprit ?? '',
    e.environment ?? '',
  ];

  const rawTitle = `${excType}: ${excValue}`;
  const stack = formatStack(e.exception);
  const tags = e.tags ?? [];
  const requestUrl = e.request?.url ?? '';

  const bodyParts: string[] = [
    '## Error',
    `\`${excType}\`: ${excValue}`,
    '',
    '## Stack (top 5)',
    '```',
    ...stack,
    '```',
    '',
    '## Context',
    `- Environment: \`${e.environment ?? '(none)'}\``,
    `- Release: \`${e.release ?? '(none)'}\``,
    `- URL: ${requestUrl || '(none)'}`,
    `- Culprit: \`${e.culprit ?? '(none)'}\``,
    `- Timestamp: ${e.timestamp ?? '(none)'}`,
  ];
  if (tags.length > 0) {
    bodyParts.push('');
    bodyParts.push('## Tags');
    for (const [k, v] of tags) bodyParts.push(`- \`${k}\`: \`${v}\``);
  }
  if (input.triggered_rule) {
    bodyParts.push('');
    bodyParts.push(`## Triggered rule`);
    bodyParts.push(`\`${input.triggered_rule}\``);
  }
  if (e.web_url) {
    bodyParts.push('');
    bodyParts.push('## Links');
    bodyParts.push(`- Sentry: ${e.web_url}`);
  }

  const rawBody = bodyParts.join('\n');

  const firstSeen =
    typeof e.timestamp === 'number'
      ? new Date(e.timestamp * 1000).toISOString()
      : typeof e.timestamp === 'string'
        ? e.timestamp
        : undefined;

  return {
    source_repo: opts.sourceRepo,
    title: scrubPII(rawTitle).slice(0, 200),
    body: scrubPII(rawBody),
    type: 'error-log',
    severity: mapSeverity(e.level),
    fingerprint: makeFingerprint(fingerprintKeys),
    environment: e.environment,
    run_url: e.web_url,
    first_seen: firstSeen,
    intent: opts.intent,
  };
}

/** HubDispatchPayload + event_type → GitHub repository_dispatch body. */
export function toDispatchBody(
  payload: HubDispatchPayload,
): { event_type: HubEventType; client_payload: HubDispatchPayload } {
  return {
    event_type: mapEventType(payload.type),
    client_payload: payload,
  };
}
