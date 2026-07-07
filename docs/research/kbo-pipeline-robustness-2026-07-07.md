# KBO 데이터 수집 파이프라인 견고화 — 평가 spec

> cycle 1476, 2026-07-07. hub-dispatch issue #2562 처리.
> source: 긱뉴스 스카우트 — k-vote-cli (한국 선거 공개 데이터 CLI)

## 현재 상태 (as-is)

### 스크래퍼 목록 (`packages/kbo-data/src/scrapers/`)

| 파일 | 소스 | 에러 처리 현황 |
|---|---|---|
| `kbo-official.ts` | koreabaseball.com API | `assertResponseOk` + catch | sleep(2s) | **재시도 없음** |
| `fancy-stats.ts` | kbofancystats.com | catch + null return | sleep(2s) | **재시도 없음** |
| `naver-schedule.ts` | Naver sports API | basic catch | **재시도 없음** |
| `kbo-scraper-alert.ts` | (helper) | HTML response 감지 → Sentry warning | Layer 2 방어 |

### 현재 resilience 계층

1. **Layer 1** (cycle 769): `Referer` 헤더 박제 — KBO bot 차단 우회
2. **Layer 2** (cycle 769 carry-over): HTML 응답 감지 즉시 Sentry warning (`kbo-scraper-alert.ts`)
3. **Rate limiting**: `sleep(SCRAPER_RATE_LIMIT_DEFAULT_MS)` = 2s 딜레이

### 식별된 gap

1. **재시도 없음**: 429 / 503 / ECONNRESET 등 transient error 시 즉시 fail-fast → pipeline silent skip 위험
2. **에러 분류 없음**: transient (재시도 가능) vs permanent (bot 차단/robots.txt) 구분 없음
3. **backoff 없음**: rate limit 상황에서 2s 고정 딜레이 — 적응형 backoff 없음

## k-vote-cli 패턴에서 배울 것

k-vote-cli의 핵심 insight (공개 데이터 접근성 패턴):
- API 키 없이 공개 endpoint 안정 접근 → **idempotent request + 명시적 retry**
- 인코딩 문제 (EUC-KR) → 명시적 charset 선언
- 다양한 응답 형식 대응 → 타입별 파서 분리

우리 컨텍스트 적용 가능성:

| 패턴 | 현재 우리 상태 | 적용 가능? |
|---|---|---|
| EUC-KR 인코딩 처리 | kbo-official.ts 에서 이미 처리 | ❌ 이미 구현됨 |
| robots.txt 확인 | kbofancystats.com robots.txt 없음, kbo 공식은 API 직접 | ❌ 해당 없음 |
| Retry with backoff | 현재 없음 | ✅ 적용 가치 있음 |
| 에러 분류 (transient vs permanent) | 없음 | ✅ 적용 가치 있음 |
| Idempotent 설계 | pipeline_runs 로 부분 보장 | 부분 완료 |

## 제안 — fetch retry wrapper

```typescript
// packages/kbo-data/src/scrapers/fetch-with-retry.ts (신규)

const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 2000,      // 기존 SCRAPER_RATE_LIMIT_DEFAULT_MS 와 일치
  maxDelayMs: 10000,
  retryOn: [429, 503, 502, 504],  // transient HTTP codes
};

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config = DEFAULT_RETRY_CONFIG,
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);
      if (config.retryOn.includes(res.status) && attempt < config.maxAttempts) {
        const delay = Math.min(config.baseDelayMs * attempt, config.maxDelayMs);
        await sleep(delay);
        continue;
      }
      return res;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < config.maxAttempts) {
        const delay = Math.min(config.baseDelayMs * attempt, config.maxDelayMs);
        await sleep(delay);
      }
    }
  }
  throw lastError ?? new Error('fetchWithRetry: max attempts exceeded');
}
```

## 자가 검증 (rubric 5축)

```yaml
self_verification:
  rubric: "가치 / 시간 비용 / risk / 자율 가능 / 의존성"
  value: medium  # transient error 재시도로 cron silent skip 감소 효과
  time_cost: small  # 단일 파일 신규 + 3 scraper 교체 (fetch → fetchWithRetry)
  risk: 1  # light — 기존 동작 변화 없음 (최대 시도 횟수 내 성공 시 동일), 시간 증가 최대 +20s
  autonomy: yes  # 메인 직접 fire 가능
  dependency: none
  tier: 1  # 즉시 fire 가능
```

## 구현 우선순위

| Step | 범위 | Tier |
|---|---|---|
| A. `fetch-with-retry.ts` 신규 | 30줄 helper | Tier 1 |
| B. `kbo-official.ts` 교체 | fetch → fetchWithRetry (2곳) | Tier 1 |
| C. `fancy-stats.ts` 교체 | fetch → fetchWithRetry (3-4곳) | Tier 1 |
| D. `naver-schedule.ts` 교체 | fetch → fetchWithRetry | Tier 1 |
| E. 테스트 | 기존 scraper 테스트 smoke | Tier 1 |

**총 추정**: 1 cycle (small/none risk). 사용자 결정 불필요.

## 결론

k-vote-cli 패턴 → 우리 컨텍스트: EUC-KR/robots.txt 이슈는 이미 해결됨. **실제 gap = retry + backoff 없음**. `fetchWithRetry` 단일 helper 추가 → 3개 스크래퍼 교체로 transient 에러 자동 복구 가능. Tier 1 (1 cycle 안 완주 가능).

**다음 cycle carry-over**: fetchWithRetry 구현 (현재 cycle 에서 spec only, 구현은 다음 cycle).
