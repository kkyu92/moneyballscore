import type { ErrorEvent } from '@sentry/nextjs';

/**
 * Sentry beforeSend 훅 — event payload 전체를 walk 해서 민감 키 [Filtered] 치환.
 *
 * 배경: Sentry Security&Privacy 의 "Additional Sensitive Fields" 기본 UI 는 request.data
 * 등 특정 경로에만 매칭. user/contexts/tags/extras 는 깊은 key 매칭이 안 됨 → 가드 B
 * 테스트에서 stripe/customer_id/discord_id 등 PII 누출 확인. 이 훅이 그 구멍 커버.
 *
 * 원칙: 대시보드 설정에 의존하지 않고 코드로 강제. 버전 컨트롤·테스트 가능.
 */

const FILTERED = '[Filtered]';

// 허브 가드 1 리스트 + 기본 스크러버 디폴트 중첩 (idempotent).
// lowercase 비교. 중복 넣어도 해 없음 — 누락이 훨씬 큰 사고.
const SENSITIVE_KEYS = new Set<string>([
  // 자격 증명
  'password', 'passwd', 'secret', 'token', 'api_key', 'apikey',
  'authorization', 'cookie', 'cookies', 'ssn', 'credentials',
  // 식별자
  'email', 'email_verified', 'phone', 'phone_number',
  'user_id', 'userid', 'member_id', 'subscriber_id',
  'session_id', 'sessionid', 'ip_address',
  // URL/req
  'referrer', 'query_string', 'querystring',
  // 인증 토큰
  'jwt', 'refresh_token', 'access_token', 'oauth',
  // 통합 키
  'supabase.auth', 'supabase.user',
  // 결제
  'stripe', 'customer_id', 'payment_method', 'charge',
  // 프로필
  'username', 'display_name', 'avatar_url',
  // 외부 플랫폼 ID
  'discord_id', 'slack_user_id', 'webhook_url',
  // cycle 442 — env 변수 키 정확 매칭 (Sentry/PII spec C-2 SENSITIVE_KEYS 감사).
  // process.env.* 가 extra/contexts.runtime.env 로 dump 되면 키 전체가 객체 key 가 됨.
  // 'token' 같은 base 키만으론 'TELEGRAM_BOT_TOKEN'.toLowerCase() 가 매칭 X (정확 매칭).
  'supabase_service_role_key', 'service_role_key', 'service_role',
  'supabase_anon_key',
  'anthropic_api_key', 'deepseek_api_key',
  'sentry_auth_token', 'sentry_webhook_secret',
  'telegram_bot_token', 'telegram_chat_id', 'bot_token', 'chat_id',
  'playbook_pat', 'personal_access_token', 'pat',
  'cron_secret', 'debug_password', 'debug_username',
  'webhook_secret', 'auth_token',
]);

// cycle 442 — suffix 매칭 (Sentry/PII spec C-2 후속).
// 동적 prefix 키 회귀 차단 (e.g. `MY_CLIENT_SECRET`, `X_BOT_TOKEN`).
// 보수 list — `_key`/`_id` 는 false positive (`region_key`, `game_id`) 위험으로 제외.
const SENSITIVE_KEY_SUFFIXES = ['_token', '_secret', '_password', '_passwd'];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lower)) return true;
  for (const suffix of SENSITIVE_KEY_SUFFIXES) {
    if (lower.endsWith(suffix)) return true;
  }
  return false;
}

function scrubObject(obj: unknown, depth = 0): unknown {
  if (depth > 20) return obj;
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((v) => scrubObject(v, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      result[key] = FILTERED;
    } else if (value !== null && typeof value === 'object') {
      result[key] = scrubObject(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function scrubUser(user: ErrorEvent['user']): ErrorEvent['user'] {
  if (!user) return user;
  // Sentry user 표준 필드 — 본 서비스는 익명 운영이므로 id/email/username/ip 전부 scrub.
  // 디버깅 필요 시 hashed id 별도 필드로 주입 고려 (지금은 불필요).
  const result = { ...user };
  if ('id' in result && result.id) result.id = FILTERED;
  if ('email' in result && result.email) result.email = FILTERED;
  if ('username' in result && result.username) result.username = FILTERED;
  if ('ip_address' in result && result.ip_address) result.ip_address = FILTERED;
  return result;
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent | null {
  if (event.user) {
    event.user = scrubUser(event.user);
  }
  if (event.contexts) {
    event.contexts = scrubObject(event.contexts) as ErrorEvent['contexts'];
  }
  if (event.tags) {
    event.tags = scrubObject(event.tags) as ErrorEvent['tags'];
  }
  if (event.extra) {
    event.extra = scrubObject(event.extra) as ErrorEvent['extra'];
  }
  // cycle 437 review-code heavy — sentry/PII spec (cycle 433) Y/C 후속.
  // event.request 와 event.breadcrumbs 누락 시 url 쿼리·헤더·navigation history 의 PII 가
  // 대시보드 기본 스크러버 의존만으로 노출 가능. 코드 강제 적용.
  if (event.request) {
    event.request = scrubObject(event.request) as ErrorEvent['request'];
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = scrubObject(event.breadcrumbs) as ErrorEvent['breadcrumbs'];
  }
  return event;
}
