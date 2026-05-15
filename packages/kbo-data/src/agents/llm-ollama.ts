/**
 * Ollama 백엔드 — 로컬 LLM 호출 wrapper
 *
 * Phase v4-2.5 신규. Claude API 대신 로컬 Ollama 서비스 사용해
 * 개발·테스트 비용 0원화. llm.ts의 backend dispatcher가 이 모듈을 선택적으로 호출.
 *
 * 모델 매핑 (v3 PLAN D2/D3 결정):
 *   'haiku' 역할(팀/회고 에이전트) → exaone3.5:7.8b (한국어 네이티브)
 *   'sonnet' 역할(심판)            → qwen2.5:14b (논리 추론 강점)
 *
 * 호출 형식: /api/generate (stream=false, JSON 응답)
 *
 * 주의:
 *   - Ollama은 retry 불필요 (로컬이라 네트워크 에러 드물고, 실패 시 원인이 보통 영구적)
 *   - stream=false로 동기 호출. 5~30초 걸릴 수 있음 (모델 크기에 비례)
 *   - tokensUsed는 eval_count (생성 토큰 수)로 근사. input token도 prompt_eval_count로 더함
 */

import { errMsg } from '@moneyball/shared';
import type { AgentResult } from './types';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

interface OllamaCallOptions {
  model: 'haiku' | 'sonnet';
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
}

function getOllamaModel(model: 'haiku' | 'sonnet'): string {
  return model === 'haiku' ? 'exaone3.5:7.8b' : 'qwen2.5:14b';
}

function getOllamaUrl(): string {
  return process.env.OLLAMA_URL ?? DEFAULT_OLLAMA_URL;
}

interface OllamaGenerateResponse {
  model?: string;
  response?: string;
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
}

export async function callOllama<T>(
  options: OllamaCallOptions,
  parseResponse: (text: string) => T
): Promise<AgentResult<T>> {
  const startTime = Date.now();
  const modelId = getOllamaModel(options.model);
  const url = `${getOllamaUrl()}/api/generate`;

  // Ollama /api/generate는 system + prompt 분리 또는 prompt 단일 모두 가능.
  // JSON 구조 응답 유도를 위해 system에 규칙, prompt에 사용자 메시지 배치.
  const body = JSON.stringify({
    model: modelId,
    system: options.systemPrompt,
    prompt: options.userMessage,
    stream: false,
    options: {
      num_predict: options.maxTokens,
      temperature: options.model === 'sonnet' ? 0.3 : 0.5,
    },
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        data: null,
        error: `Ollama ${res.status}: ${errText.slice(0, 200)}`,
        model: `ollama:${modelId}`,
        tokensUsed: 0,
        durationMs: Date.now() - startTime,
      };
    }

    const json = (await res.json()) as OllamaGenerateResponse;

    if (json.error) {
      return {
        success: false,
        data: null,
        error: `Ollama error: ${json.error.slice(0, 200)}`,
        model: `ollama:${modelId}`,
        tokensUsed: 0,
        durationMs: Date.now() - startTime,
      };
    }

    const text = json.response ?? '';
    const tokensUsed = (json.prompt_eval_count ?? 0) + (json.eval_count ?? 0);

    const data = parseResponse(text);

    return {
      success: true,
      data,
      error: null,
      model: `ollama:${modelId}`,
      tokensUsed,
      durationMs: Date.now() - startTime,
    };
  } catch (e) {
    return {
      success: false,
      data: null,
      error: errMsg(e),
      model: `ollama:${modelId}`,
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
    };
  }
}
