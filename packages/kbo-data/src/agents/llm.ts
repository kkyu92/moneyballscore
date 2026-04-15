import type { AgentResult } from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// 재시도 정책: 3회 시도, 500ms → 1000ms → 2000ms exponential backoff
// 재시도 대상: 네트워크 에러, 5xx, 429(rate limit)
// 재시도 제외: 4xx (400/401/403 등 — 요청 자체가 잘못됨)
export const RETRY_BACKOFF_MS = [500, 1000, 2000] as const;
export const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length;

interface LLMCallOptions {
  model: 'haiku' | 'sonnet';
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
}

function getModelId(model: 'haiku' | 'sonnet'): string {
  return model === 'haiku'
    ? 'claude-haiku-4-5-20251001'
    : 'claude-sonnet-4-6-20250514';
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Claude API 호출 (에이전트용)
 * Haiku: 팀 에이전트/회고 에이전트 (저비용, 빠름)
 * Sonnet: 심판 에이전트 (고품질 판단)
 *
 * 재시도: 네트워크 에러 + 5xx + 429에 대해 최대 3회(500/1000/2000ms backoff).
 * 4xx는 즉시 실패(요청 자체가 잘못된 것이라 재시도해도 무의미).
 */
export async function callLLM<T>(
  options: LLMCallOptions,
  parseResponse: (text: string) => T
): Promise<AgentResult<T>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      data: null,
      error: 'ANTHROPIC_API_KEY not set',
      model: options.model,
      tokensUsed: 0,
      durationMs: 0,
    };
  }

  const startTime = Date.now();
  const modelId = getModelId(options.model);
  const body = JSON.stringify({
    model: modelId,
    max_tokens: options.maxTokens,
    system: options.systemPrompt,
    messages: [{ role: 'user', content: options.userMessage }],
  });

  let lastError = 'unknown';

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body,
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = `API ${res.status}: ${errText.slice(0, 200)}`;

        if (isRetryableStatus(res.status) && attempt < MAX_ATTEMPTS - 1) {
          await sleep(RETRY_BACKOFF_MS[attempt]);
          continue;
        }

        return {
          success: false,
          data: null,
          error: lastError,
          model: options.model,
          tokensUsed: 0,
          durationMs: Date.now() - startTime,
        };
      }

      const json = await res.json();
      const text = json.content?.[0]?.text || '';
      const tokensUsed = (json.usage?.input_tokens || 0) + (json.usage?.output_tokens || 0);

      const data = parseResponse(text);

      return {
        success: true,
        data,
        error: null,
        model: options.model,
        tokensUsed,
        durationMs: Date.now() - startTime,
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_BACKOFF_MS[attempt]);
        continue;
      }
    }
  }

  return {
    success: false,
    data: null,
    error: lastError,
    model: options.model,
    tokensUsed: 0,
    durationMs: Date.now() - startTime,
  };
}
