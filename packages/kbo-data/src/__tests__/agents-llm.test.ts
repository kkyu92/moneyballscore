import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callLLM, MAX_ATTEMPTS } from '../agents/llm';

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
    expect(result.error).toContain('401');
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
});
