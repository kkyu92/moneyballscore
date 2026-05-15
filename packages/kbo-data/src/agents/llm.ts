import type { AgentResult } from './types';
import { callOllama } from './llm-ollama';
import { callDeepSeek } from './llm-deepseek';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// 재시도 정책: 3회 시도, 500ms → 1000ms → 2000ms exponential backoff
// 재시도 대상: 네트워크 에러, 5xx, 429(rate limit)
// 재시도 제외: 4xx (400/401/403 등 — 요청 자체가 잘못됨)
const RETRY_BACKOFF_MS = [500, 1000, 2000] as const;
export const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length;

export interface LLMCallOptions {
  model: 'haiku' | 'sonnet';
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
}

export type LLMBackend = 'claude' | 'ollama' | 'deepseek';

/**
 * 역할별 백엔드 선택 (v4-4 Hybrid 지원)
 *
 * 우선순위:
 *   1. 역할별 env var 직접 지정 (LLM_BACKEND_HAIKU / LLM_BACKEND_SONNET)
 *   2. 전역 LLM_BACKEND (전부 한 backend)
 *   3. 기본값 'claude' (프로덕션 안전)
 *
 * 프로덕션 Hybrid 권장 설정:
 *   LLM_BACKEND_HAIKU=deepseek  (팀/회고/postview team: 저렴)
 *   LLM_BACKEND_SONNET=claude   (심판: 블로그 reasoning 고품질)
 *
 * 개발 드라이런:
 *   LLM_BACKEND=ollama          (모든 역할 로컬, $0)
 *   LLM_BACKEND=deepseek        (모든 역할 DeepSeek, ~$0.02/경기)
 */
function getBackend(role: 'haiku' | 'sonnet'): LLMBackend {
  const roleKey = role === 'haiku' ? 'LLM_BACKEND_HAIKU' : 'LLM_BACKEND_SONNET';
  const roleRaw = process.env[roleKey]?.toLowerCase();
  if (roleRaw === 'ollama') return 'ollama';
  if (roleRaw === 'deepseek') return 'deepseek';
  if (roleRaw === 'claude') return 'claude';

  const globalRaw = process.env.LLM_BACKEND?.toLowerCase();
  if (globalRaw === 'ollama') return 'ollama';
  if (globalRaw === 'deepseek') return 'deepseek';
  return 'claude';
}

function getModelId(model: 'haiku' | 'sonnet'): string {
  // Anthropic Claude 4.x 모델 ID
  // Haiku 4.5: 'claude-haiku-4-5-20251001' (2025-10-01 릴리즈, 팀/회고 에이전트용)
  // Sonnet 4.6: 'claude-sonnet-4-6' (심판용 — 이전 버전 'claude-sonnet-4-6-20250514'는 오타. 20250514는 구 Sonnet 4.0 날짜였음. 2026-04-15 v4-2 프로덕션 검증 중 judge 실패로 발견)
  return model === 'haiku'
    ? 'claude-haiku-4-5-20251001'
    : 'claude-sonnet-4-6';
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Anthropic API 에러 응답을 canonical 분류로 매핑.
 *
 * 원본 에러 응답 구조:
 *   {type:'error', error:{type:'invalid_request_error', message:'Your credit balance is too low...'}}
 *
 * Telegram/Sentry alert 에 raw JSON 누설 차단 + 사용자/오너 액션 명확화.
 * 분류:
 *   - CREDIT_EXHAUSTED: 계정 credit 잔액 부족 (Plans & Billing 충전 필요)
 *   - AUTH_INVALID: API key 인증 실패
 *   - RATE_LIMITED: 분당/일 token 한도 초과
 *   - INVALID_REQUEST: 4xx generic
 *   - SERVER_ERROR: 5xx
 *   - UNKNOWN: 위 패턴 매칭 실패
 */
export function classifyAnthropicError(status: number, body: string): string {
  let errorType = '';
  let message = '';
  try {
    const parsed = JSON.parse(body) as {
      error?: { type?: string; message?: string };
    };
    errorType = parsed.error?.type ?? '';
    message = parsed.error?.message ?? '';
  } catch {
    // raw body — JSON 파싱 실패. message 만 trim 사용.
    message = body.slice(0, 100);
  }

  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('credit balance')) {
    return `CREDIT_EXHAUSTED: Anthropic API 잔액 부족 (Plans & Billing 충전 필요)`;
  }
  if (status === 401 || errorType === 'authentication_error' || lowerMsg.includes('x-api-key')) {
    return `AUTH_INVALID: ANTHROPIC_API_KEY 인증 실패`;
  }
  if (status === 429 || errorType === 'rate_limit_error') {
    return `RATE_LIMITED: ${message.slice(0, 100) || 'token/요청 한도 초과'}`;
  }
  if (status >= 500) {
    return `SERVER_ERROR ${status}: ${message.slice(0, 100) || errorType || 'upstream 5xx'}`;
  }
  if (status >= 400) {
    const detail = message.slice(0, 100) || errorType || 'invalid request';
    return `INVALID_REQUEST ${status}: ${detail}`;
  }
  return `UNKNOWN ${status}: ${message.slice(0, 100) || errorType || 'no detail'}`;
}

/**
 * LLM 호출 디스패처 (Phase v4-2.5)
 *
 * LLM_BACKEND 환경변수로 백엔드 선택:
 *   - 'claude' (기본값, 프로덕션 안전): Anthropic API 호출
 *   - 'ollama': 로컬 Ollama 서비스 호출 (exaone3.5:7.8b / qwen2.5:14b)
 *
 * 로컬 개발에서 LLM_BACKEND=ollama로 비용 0원 테스트 가능.
 * Vercel 프로덕션은 LLM_BACKEND 설정 안 하면 자동으로 claude 사용.
 */
export async function callLLM<T>(
  options: LLMCallOptions,
  parseResponse: (text: string) => T
): Promise<AgentResult<T>> {
  const backend = getBackend(options.model);
  if (backend === 'ollama') {
    return callOllama(options, parseResponse);
  }
  if (backend === 'deepseek') {
    return callDeepSeek(options, parseResponse);
  }
  return callClaude(options, parseResponse);
}

/**
 * Claude API 호출 (에이전트용)
 * Haiku: 팀 에이전트/회고 에이전트 (저비용, 빠름)
 * Sonnet: 심판 에이전트 (고품질 판단)
 *
 * 재시도: 네트워크 에러 + 5xx + 429에 대해 최대 3회(500/1000/2000ms backoff).
 * 4xx는 즉시 실패(요청 자체가 잘못된 것이라 재시도해도 무의미).
 */
async function callClaude<T>(
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
        lastError = classifyAnthropicError(res.status, errText);

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
