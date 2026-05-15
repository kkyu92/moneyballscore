import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callLLM, MAX_ATTEMPTS, classifyAnthropicError } from '../agents/llm';

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
