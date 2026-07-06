---
created_at: 2026-07-06
cycle: 1469
topic: CREDIT_EXHAUSTED 자동 fallback — LLM_BACKEND_FALLBACK 레이어
target_chain: fix-incident
status: spec_pending_user_review
author: develop-cycle explore-idea (lite)
---

# CREDIT_EXHAUSTED 자동 Fallback Spec

## 문제

`ANTHROPIC_API_KEY` 잔액 소진(CREDIT_EXHAUSTED) 발생 시 `callClaude()` 가 즉시 실패 반환 → 모든 에이전트(team-agent / judge-agent / calibration-agent / postview) fallback → `confidence: 0.3` 고정 → 예측 품질 전면 저하.

현 발생 기간: **2026-06-06 ~ 진행 중** (30+ 일 지속).

영향:
- debate 100% fallback → `conf = 0.3` (모든 경기)
- 분석 reasoning 빈칸 (`homeArgSummary = ''`)
- Brier 측정 시 CREDIT_EXHAUSTED 구간 데이터 오염 (Fable plan S2c 확인)

## 현재 아키텍처

`packages/kbo-data/src/agents/llm.ts` 이미 3 backend 지원:

| backend | env var | 비용 | 용도 |
|---|---|---|---|
| `claude` (기본) | `ANTHROPIC_API_KEY` | ~$0.05/game | 프로덕션 기본 |
| `deepseek` | `DEEPSEEK_API_KEY` | ~$0.001/game | 개발/fallback 후보 |
| `ollama` | 없음 (localhost) | $0 | 로컬 드라이런 |

역할별 수동 override: `LLM_BACKEND_HAIKU` / `LLM_BACKEND_SONNET` env var. 현재는 수동 전환만 지원 — CREDIT_EXHAUSTED 발생 시 자동 failover 없음.

## 제안

### Option A (권장): `LLM_BACKEND_FALLBACK` 자동 failover

**`callLLM` 레이어에 failover 로직 추가.**

```
callLLM(options, parseResponse)
  → backend = getBackend(role)  (기존 로직)
  → if backend='claude' AND CREDIT_EXHAUSTED 감지 AND LLM_BACKEND_FALLBACK 설정
    → fallback_backend = LLM_BACKEND_FALLBACK 값 (deepseek / ollama)
    → re-dispatch to fallback
    → Sentry capture with tag 'credit_exhausted_fallback' + fallback_backend
  → 결과 반환 (fallback 성공 시 success=true, data 정상)
```

**변경 파일**: `packages/kbo-data/src/agents/llm.ts` 1 함수 (`callLLM`) + 에러 분류 체크 (~30줄)

**새 env var**:
- `LLM_BACKEND_FALLBACK=deepseek` — fallback backend 지정 (미설정 시 기존 동작 유지, 하위 호환)

**사용자 설정 필요**:
1. `DEEPSEEK_API_KEY` 발급 (DeepSeek 콘솔, 무료 $5 크레딧 제공)
2. Vercel 프로덕션 env: `vercel env add LLM_BACKEND_FALLBACK production` → `deepseek`
3. Vercel 프로덕션 env: `vercel env add DEEPSEEK_API_KEY production` → 발급 키

**비용**: DeepSeek-chat ~$0.001/game (경기당 5 LLM 호출 × 1k tokens 추정). 일 5경기 = ~$0.005/일 = **월 $0.15** 수준.

**구현 난도**: small (1 함수, 30줄 내외, 기존 callDeepSeek 재사용)

**risk**: DeepSeek 응답 품질 — 심판 reasoning 한국어 KBO 도메인 정합성 불확실. Layer 1 validator (validator.ts) 가 already 환각 차단 운영 중이라 최악 = validator reject → 기존 conf=0.3 fallback (현 상태와 동일). 최선 = DeepSeek reasoning 정상 → conf 복구.

### Option B: UI "간소화 모드" 배너

**예측이 간소화 상태임을 사용자에게 투명하게 공개.**

`apps/moneyball/src/app/predictions/page.tsx` (또는 `/analysis`) 상단에 조건부 배너:

```
조건: 당일 predictions 평균 confidence ≤ 0.32 (CREDIT_EXHAUSTED 시 전체 0.3)
배너: "현재 분석 시스템이 간소화 모드로 운영 중입니다. 확률 수치는 통계 모델 기반이며, 상세 분석 텍스트는 일시 중단됩니다."
```

**변경 파일**: `apps/moneyball/src/app/predictions/page.tsx` 또는 server component prop 추가

**구현 난도**: small (server component 조건부 렌더링)

**risk**: 0 (사용자 가시 정보 투명성 향상만)

## 권장 실행 순서

1. **지금 (사용자 설정 후 Option A)**: DeepSeek API key 발급 + Vercel env 2개 추가 → Option A 구현 → deploy → Sentry 'credit_exhausted_fallback' 태그로 전환 검증
2. **Option A 병행 (코드 구현 자율 영역)**: fix-incident chain 에서 `callLLM` 수정 + Sentry capture + unit test
3. **Option B (독립, 즉시 구현 가능)**: 사용자 env 불필요, 자율 영역 단독 ship 가능

## 자가검증

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  option_a:
    가치: high (30+ 일 지속 품질 저하 즉시 복구)
    시간비용: small (~30줄, 기존 callDeepSeek 재사용)
    risk: 1 (DeepSeek 품질 불확실, but validator 차단망 있음)
    자율가능: partial (코드=자율, DeepSeek API key=사용자 영역)
    의존성: 사용자 DeepSeek API key 발급
  option_b:
    가치: low-medium (투명성, 품질 자체는 미복구)
    시간비용: small (~10줄)
    risk: 0
    자율가능: yes (완전 자율 영역)
    의존성: none
  tier:
    option_a: Tier 2 (사용자 API key 의존)
    option_b: Tier 1 (즉시 자율 fire 가능)
```

## 다음 단계

- **사용자 확인 필요**: Option A 진행 여부 (DeepSeek API key 발급 의지)
- **자율 영역 즉시 fire 가능**: Option B (UI 배너) — fix-incident (lite) chain

status: `spec_pending_user_review` → 사용자 OK 시 `fix-incident` chain 자동 매핑
