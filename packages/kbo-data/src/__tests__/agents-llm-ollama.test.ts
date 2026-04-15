import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callOllama } from '../agents/llm-ollama';
import { callLLM } from '../agents/llm';

const originalFetch = global.fetch;
const originalOllamaUrl = process.env.OLLAMA_URL;
const originalBackend = process.env.LLM_BACKEND;
const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

function ollamaResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function successBody(text = '{"ok":true}') {
  return {
    model: 'exaone3.5:7.8b',
    response: text,
    done: true,
    prompt_eval_count: 120,
    eval_count: 340,
  };
}

describe('callOllama', () => {
  beforeEach(() => {
    delete process.env.OLLAMA_URL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalOllamaUrl === undefined) delete process.env.OLLAMA_URL;
    else process.env.OLLAMA_URL = originalOllamaUrl;
    vi.restoreAllMocks();
  });

  it('haiku 역할 → exaone3.5:7.8b 모델로 호출', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ollamaResponse(successBody('hi')));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await callOllama(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 500 },
      (t) => t
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('hi');
    expect(result.model).toBe('ollama:exaone3.5:7.8b');
    expect(result.tokensUsed).toBe(460); // 120 + 340

    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[0]).toBe('http://localhost:11434/api/generate');
    const body = JSON.parse(callArgs[1].body);
    expect(body.model).toBe('exaone3.5:7.8b');
    expect(body.system).toBe('s');
    expect(body.prompt).toBe('u');
    expect(body.stream).toBe(false);
    expect(body.options.num_predict).toBe(500);
  });

  it('sonnet 역할 → qwen2.5:14b 모델로 호출', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ollamaResponse(successBody('judged')));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await callOllama(
      { model: 'sonnet', systemPrompt: 's', userMessage: 'u', maxTokens: 1500 },
      (t) => t
    );

    expect(result.success).toBe(true);
    expect(result.model).toBe('ollama:qwen2.5:14b');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('qwen2.5:14b');
    expect(body.options.temperature).toBe(0.3); // sonnet은 낮은 temp
  });

  it('OLLAMA_URL 환경변수로 엔드포인트 오버라이드', async () => {
    process.env.OLLAMA_URL = 'http://192.168.1.100:11434';
    const fetchMock = vi.fn().mockResolvedValue(ollamaResponse(successBody()));
    global.fetch = fetchMock as unknown as typeof fetch;

    await callOllama(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );

    expect(fetchMock.mock.calls[0][0]).toBe('http://192.168.1.100:11434/api/generate');
  });

  it('HTTP 500 에러 → success=false', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ollamaResponse({ error: 'model not found' }, 500));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await callOllama(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('500');
  });

  it('응답 body.error 필드 → success=false', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ollamaResponse({ error: 'model "exaone3.5:7.8b" not found, try pulling it first' })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await callOllama(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('네트워크 에러 → success=false (재시도 없음 — 로컬이므로)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await callOllama(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
    expect(fetchMock).toHaveBeenCalledTimes(1); // 재시도 없음
  });

  it('parseResponse 적용 — JSON 추출', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ollamaResponse(successBody('{"confidence":0.7,"reasoning":"test"}'))
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await callOllama(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 200 },
      (text) => JSON.parse(text.match(/\{[\s\S]*\}/)![0])
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ confidence: 0.7, reasoning: 'test' });
  });
});

describe('callLLM dispatcher', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalBackend === undefined) delete process.env.LLM_BACKEND;
    else process.env.LLM_BACKEND = originalBackend;
    if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    vi.restoreAllMocks();
  });

  it('LLM_BACKEND=ollama → Ollama 엔드포인트 호출', async () => {
    process.env.LLM_BACKEND = 'ollama';
    const fetchMock = vi.fn().mockResolvedValue(ollamaResponse(successBody('from ollama')));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );

    expect(result.success).toBe(true);
    expect(result.model).toContain('ollama:');
    expect(fetchMock.mock.calls[0][0]).toContain('localhost:11434');
  });

  it('LLM_BACKEND 미설정 → 기본 Claude 엔드포인트 호출 (프로덕션 안전)', async () => {
    delete process.env.LLM_BACKEND;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'from claude' }],
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
        { status: 200 }
      )
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('from claude');
    expect(fetchMock.mock.calls[0][0]).toContain('api.anthropic.com');
  });

  it('LLM_BACKEND=claude 명시 → Claude', async () => {
    process.env.LLM_BACKEND = 'claude';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'ok' }],
          usage: { input_tokens: 5, output_tokens: 5 },
        }),
        { status: 200 }
      )
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await callLLM(
      { model: 'sonnet', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );

    expect(result.success).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toContain('api.anthropic.com');
  });

  it('LLM_BACKEND=OLLAMA 대소문자 허용 → ollama로 분기', async () => {
    process.env.LLM_BACKEND = 'OLLAMA';
    const fetchMock = vi.fn().mockResolvedValue(ollamaResponse(successBody()));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );

    expect(result.model).toContain('ollama:');
  });

  it('LLM_BACKEND=invalid → 기본 claude로 fallback', async () => {
    process.env.LLM_BACKEND = 'gpt';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'fallback' }],
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200 }
      )
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await callLLM(
      { model: 'haiku', systemPrompt: 's', userMessage: 'u', maxTokens: 100 },
      (t) => t
    );

    expect(fetchMock.mock.calls[0][0]).toContain('api.anthropic.com');
  });
});
