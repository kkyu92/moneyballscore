import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callLLM, MAX_ATTEMPTS, MAX_OVERLOADED_ATTEMPTS, classifyAnthropicError, backoffMs } from '../agents/llm';

const originalFetch = global.fetch;
const originalKey = process.env.ANTHROPIC_API_KEY;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function successBody(text = '{"ok":true}') {
  return {
    content: [{ type: 'text', text }],
    usage: { input_tokens: 10, output_tokens: 20 },
  };
}

describe('callLLM retry/backoff', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it('API 키 없으면 즉시 실패 (fetch 호출 없음)', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('ANTHROPIC_API_KEY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('첫 시도에 200 → 재시도 없음', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(successBody('hello')));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t.toUpperCase()
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('HELLO');
    expect(result.tokensUsed).toBe(30);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('5xx → 재시도 → 3번째 시도에 200 성공', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'overloaded' }, 503))
      .mockResolvedValueOnce(jsonResponse({ error: 'overloaded' }, 503))
      .mockResolvedValueOnce(jsonResponse(successBody('final')));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = callLLM(
      { model: 'sonnet', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('final');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('429 rate limit도 재시도 대상', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'rate_limit' }, 429))
      .mockResolvedValueOnce(jsonResponse(successBody('ok')));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('4xx (401) 즉시 실패, 재시도 없음', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('AUTH_INVALID');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('400 Bad Request도 재시도 없음', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'bad_request' }, 400));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('네트워크 에러(throw) → 재시도 후 성공', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(jsonResponse(successBody('recovered')));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('recovered');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('전부 5xx → MAX_ATTEMPTS번 시도 후 최종 실패, 마지막 에러 반환', async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      jsonResponse({ error: 'overloaded' }, 503)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('503');
    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });

  it('전부 네트워크 에러 → MAX_ATTEMPTS번 시도 후 실패', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('ETIMEDOUT');
    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });

  // cycle 986 — 529 Overloaded 시 attempts 동적 확장 (3 → 4).
  // evidence: 14d agentsFailed 17건 중 5건 (29.4%) 가 5/19 Anthropic 외부 장애 SERVER_ERROR 529.
  // 기존 3 attempts (17.5s window) 부족 → 4 attempts (37.5s window) 로 확장하여
  // capacity 회복 확률 ↑.
  it('cycle 986: 전부 529 Overloaded → MAX_OVERLOADED_ATTEMPTS (4) 시도', async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      jsonResponse({ error: { type: 'overloaded_error', message: 'Overloaded' } }, 529)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('529');
    expect(fetchMock).toHaveBeenCalledTimes(MAX_OVERLOADED_ATTEMPTS);
    expect(MAX_OVERLOADED_ATTEMPTS).toBeGreaterThan(MAX_ATTEMPTS);
  });

  // cycle 986 — 529 → 200 회복 시 확장된 attempt 안 정상 성공 박제
  it('cycle 986: 529 3회 → 4번째 200 회복 → success (확장 attempt 효과 검증)', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: { type: 'overloaded_error', message: 'Overloaded' } }, 529))
      .mockResolvedValueOnce(jsonResponse({ error: { type: 'overloaded_error', message: 'Overloaded' } }, 529))
      .mockResolvedValueOnce(jsonResponse({ error: { type: 'overloaded_error', message: 'Overloaded' } }, 529))
      .mockResolvedValueOnce(jsonResponse(successBody('recovered after 529 storm')));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('recovered after 529 storm');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  // cycle 986 — 일반 5xx 는 attempts 확장 X (overcompensate 회피 검증)
  it('cycle 986: 503 4회 시도 시 3번째에서 멈춤 (529 만 확장)', async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      jsonResponse({ error: { type: 'overloaded_error', message: 'upstream 503' } }, 503)
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('503');
    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });

  // LLM_BACKEND_FALLBACK — CREDIT_EXHAUSTED 자동 failover (cycle 1491)
  it('CREDIT_EXHAUSTED + LLM_BACKEND_FALLBACK=deepseek → deepseek 재시도 (no key = deepseek 에러)', async () => {
    const creditErrorBody = {
      type: 'error',
      error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' },
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(creditErrorBody, 400));
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.LLM_BACKEND_FALLBACK = 'deepseek';
    delete process.env.DEEPSEEK_API_KEY;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    // callDeepSeek 는 DEEPSEEK_API_KEY 없으면 fetch 호출 없이 즉시 에러 반환
    expect(result.success).toBe(false);
    expect(result.error).toContain('DEEPSEEK_API_KEY');
    // claude fetch 1번만 (deepseek 는 key 없어 fetch 미호출)
    expect(fetchMock).toHaveBeenCalledTimes(1);

    delete process.env.LLM_BACKEND_FALLBACK;
  });

  it('CREDIT_EXHAUSTED + no LLM_BACKEND_FALLBACK → 원본 에러 반환 (하위 호환)', async () => {
    const creditErrorBody = {
      type: 'error',
      error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' },
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(creditErrorBody, 400));
    global.fetch = fetchMock as unknown as typeof fetch;
    delete process.env.LLM_BACKEND_FALLBACK;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('CREDIT_EXHAUSTED');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // cycle 461 — credit balance too low 실제 incident → raw JSON leak 차단 검증
  it('credit balance too low 400 → CREDIT_EXHAUSTED 분류 (raw JSON leak 차단)', async () => {
    const creditErrorBody = {
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message:
          'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.',
      },
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(creditErrorBody, 400));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('CREDIT_EXHAUSTED');
    expect(result.error).toContain('Plans & Billing');
    // raw JSON 응답 leak 차단 (이전 동작: errText.slice(0,200) 으로 응답 본문 통째 노출)
    expect(result.error).not.toContain('{"type":"error"');
    expect(result.error).not.toContain('invalid_request_error');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('classifyAnthropicError', () => {
  it('credit balance too low → CREDIT_EXHAUSTED', () => {
    const body = JSON.stringify({
      type: 'error',
      error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' },
    });
    expect(classifyAnthropicError(400, body)).toContain('CREDIT_EXHAUSTED');
  });

  it('401 authentication_error → AUTH_INVALID', () => {
    const body = JSON.stringify({ error: { type: 'authentication_error', message: 'invalid x-api-key' } });
    expect(classifyAnthropicError(401, body)).toContain('AUTH_INVALID');
  });

  it('429 rate_limit_error → RATE_LIMITED', () => {
    const body = JSON.stringify({ error: { type: 'rate_limit_error', message: 'tokens per minute exceeded' } });
    const result = classifyAnthropicError(429, body);
    expect(result).toContain('RATE_LIMITED');
    expect(result).toContain('tokens per minute');
  });

  it('503 overloaded → SERVER_ERROR 503', () => {
    const body = JSON.stringify({ error: { type: 'overloaded_error', message: 'upstream overloaded' } });
    expect(classifyAnthropicError(503, body)).toContain('SERVER_ERROR 503');
  });

  it('400 generic invalid_request → INVALID_REQUEST 400', () => {
    const body = JSON.stringify({ error: { type: 'invalid_request_error', message: 'max_tokens out of range' } });
    const result = classifyAnthropicError(400, body);
    expect(result).toContain('INVALID_REQUEST 400');
    expect(result).toContain('max_tokens');
  });

  it('파싱 불가 body → UNKNOWN or status 분류 (truncate)', () => {
    const body = '<html>500 Bad Gateway</html>'.repeat(20);
    const result = classifyAnthropicError(502, body);
    expect(result).toContain('SERVER_ERROR 502');
    // 100자 truncate 검증 — raw HTML 전체 leak X
    expect(result.length).toBeLessThan(200);
  });
});

// 사례 (2026-05-19 5경기 토론 fallback) — Anthropic 529 Overloaded 시 기본
// 3.5s backoff 부족, capacity 회복 못 잡아 fallback row 박제. 5x 곱해 17.5s
// 까지 늘림 — capacity 회복 확률 상승.
// cycle 986 강화 — 3 attempts (17.5s) 도 부족 evidence (14d 5건 fallback).
// 529 단독 4 attempts 로 확장: 2.5s → 5s → 10s → 20s = 37.5s window.
describe('backoffMs (529 overloaded multiplier + cycle 986 확장)', () => {
  it('200-499 status 일반 backoff', () => {
    expect(backoffMs(0, 503)).toBe(500);
    expect(backoffMs(1, 503)).toBe(1000);
    expect(backoffMs(2, 503)).toBe(2000);
  });

  it('429 rate limit 일반 backoff', () => {
    expect(backoffMs(0, 429)).toBe(500);
    expect(backoffMs(2, 429)).toBe(2000);
  });

  it('529 overloaded 5x backoff (첫 3 attempt 호환 유지)', () => {
    expect(backoffMs(0, 529)).toBe(2500);
    expect(backoffMs(1, 529)).toBe(5000);
    expect(backoffMs(2, 529)).toBe(10000);
  });

  it('cycle 986: 529 attempt 3 → 20s backoff (4번째 시도)', () => {
    expect(backoffMs(3, 529)).toBe(20000);
  });

  it('cycle 986: 529 attempt index overflow → 마지막 backoff clamp', () => {
    expect(backoffMs(99, 529)).toBe(20000);
  });

  it('cycle 986: 일반 5xx attempt index overflow → 마지막 backoff clamp (network catch path 호환)', () => {
    expect(backoffMs(99, 503)).toBe(2000);
  });
});
