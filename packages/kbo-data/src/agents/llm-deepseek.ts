/**
 * DeepSeek 백엔드 — OpenAI 호환 API wrapper
 *
 * v4-4 empirical 테스트용. Claude API 대비 품질 비교를 위해 추가.
 *
 * 모델 매핑:
 *   'haiku' 역할(팀/회고 에이전트) → deepseek-chat (V3, 저비용·고속)
 *   'sonnet' 역할(심판)           → deepseek-chat (V3, 동일 모델 사용)
 *   (deepseek-reasoner는 chain-of-thought 특화라 JSON 출력에 부적합 — 사용 안 함)
 *
 * 비용 (2026-04 시점):
 *   - Input: $0.14 / 1M tokens
 *   - Output: $0.28 / 1M tokens
 *   - 경기당 ~7k tokens 기준 월 8.4M tokens → ~$1.50/월 (Claude 대비 20~30배 저렴)
 *
 * Endpoint: https://api.deepseek.com (OpenAI 호환)
 * Auth: Bearer DEEPSEEK_API_KEY
 */

import { errMsg } from '@moneyball/shared';
import type { AgentResult } from './types';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [500, 1000, 2000] as const;

interface DeepSeekCallOptions {
  model: 'haiku' | 'sonnet';
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
}

function getDeepSeekModel(_model: 'haiku' | 'sonnet'): string {
  // 두 역할 모두 deepseek-chat (V3) 사용. 구조화 출력에 최적.
  return 'deepseek-chat';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

interface DeepSeekResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
}

export async function callDeepSeek<T>(
  options: DeepSeekCallOptions,
  parseResponse: (text: string) => T
): Promise<AgentResult<T>> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      data: null,
      error: 'DEEPSEEK_API_KEY not set',
      model: options.model,
      tokensUsed: 0,
      durationMs: 0,
    };
  }

  const startTime = Date.now();
  const modelId = getDeepSeekModel(options.model);

  // 심판 역할은 낮은 temperature (일관성), 팀 에이전트는 약간 창의적
  const temperature = options.model === 'sonnet' ? 0.3 : 0.5;

  const body = JSON.stringify({
    model: modelId,
    max_tokens: options.maxTokens,
    temperature,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userMessage },
    ],
  });

  let lastError = 'unknown';

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body,
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = `DeepSeek ${res.status}: ${errText.slice(0, 200)}`;

        if (isRetryableStatus(res.status) && attempt < MAX_ATTEMPTS - 1) {
          await sleep(RETRY_BACKOFF_MS[attempt]);
          continue;
        }

        return {
          success: false,
          data: null,
          error: lastError,
          model: `deepseek:${modelId}`,
          tokensUsed: 0,
          durationMs: Date.now() - startTime,
        };
      }

      const json = (await res.json()) as DeepSeekResponse;

      if (json.error) {
        return {
          success: false,
          data: null,
          error: `DeepSeek error: ${String(json.error.message).slice(0, 200)}`,
          model: `deepseek:${modelId}`,
          tokensUsed: 0,
          durationMs: Date.now() - startTime,
        };
      }

      const text = json.choices?.[0]?.message?.content ?? '';
      const tokensUsed = json.usage?.total_tokens ?? 0;

      const data = parseResponse(text);

      return {
        success: true,
        data,
        error: null,
        model: `deepseek:${modelId}`,
        tokensUsed,
        durationMs: Date.now() - startTime,
      };
    } catch (e) {
      lastError = errMsg(e);
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
    model: `deepseek:${modelId}`,
    tokensUsed: 0,
    durationMs: Date.now() - startTime,
  };
}
