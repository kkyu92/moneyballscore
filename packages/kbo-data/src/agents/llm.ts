import type { AgentResult } from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

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

/**
 * Claude API 호출 (에이전트용)
 * Haiku: 팀 에이전트/회고 에이전트 (저비용, 빠름)
 * Sonnet: 심판 에이전트 (고품질 판단)
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

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: options.maxTokens,
        system: options.systemPrompt,
        messages: [
          { role: 'user', content: options.userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        data: null,
        error: `API ${res.status}: ${errText.slice(0, 200)}`,
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
    return {
      success: false,
      data: null,
      error: e instanceof Error ? e.message : String(e),
      model: options.model,
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
    };
  }
}
