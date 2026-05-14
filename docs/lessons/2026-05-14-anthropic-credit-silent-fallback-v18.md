# Anti-Pattern: v1.8 era 전체 quant-only fallback — ANTHROPIC_API_KEY credit 소진 silent

**카테고리**: anti_pattern / observability / silent_drift
**발견**: cycle 383 (2026-05-14), operational-analysis lite

---

## Problem

v1.8 scoring_rule 첫 fire (2026-05-13) 이후 모든 예측이 정량-only fallback 으로 silent 운영 중. v1.8 가중치 변경 (head_to_head 5→3% / elo 8→10%) 효과 측정 불가능.

### 증거 (Supabase predictions table)

| 시점 | scoring_rule | 건수 | totalTokens | confidence | reasoning |
|---|---|---|---|---|---|
| 2026-05-12 07:17 (Tue) | v1.7-revert | 1~3 게임 | 8376 / 8313 / 8782 | 0.52 / 0.45 / 0.50 | 정상 토론 |
| 2026-05-12 07:18 (Tue) | v1.7-revert | 4 게임 | 7064 | 0.30 | "에이전트 토론 불가" (mid-flight fail) |
| 2026-05-12 07:18 (Tue) | v1.7-revert | 5 게임 | **0** | 0.30 | "에이전트 토론 불가" |
| 2026-05-13 07:17 (Wed) | v1.8 | 1~5 게임 (pre_game) | **0** | 0.30 | "에이전트 토론 불가. 정량 모델 v1.8 결과 사용." |
| 2026-05-13 12:20~13:01 (Wed) | v1.8 | 1~5 게임 (postview) | — | 0.30 | (postview 동일 패턴 의심) |

5/12 batch 4-5번째 게임에서 API credit 또는 인증이 끊기기 시작 → 5/13 v1.8 첫 fire 시점엔 완전히 죽음 → 5/13 모든 v1.8 예측 = quant-only fallback.

## Root Cause 가설

1. **ANTHROPIC_API_KEY credit 소진**: PR #372 (cycle 362) commit body 가 정확히 본 시나리오 명시 — "ANTHROPIC_API_KEY credit 소진 시 HTTP 400 반환 → 모든 LLM 호출 실패 → fallback verdict(confidence=0.3)로 예측이 silently 저장". 5/12 batch 중반 부터 credit fail 패턴 시작 = 가설 일치.
2. **PR #372 fix 부분 적용**: 5/13 17:24 KST merge. v1.8 첫 pre_game fire = 5/13 16:17 KST → fix 미적용 상태로 mv='v2.0-debate' 라벨 silent drift. postview path 는 fix 미적용 — `mv='v2.0-postview'` 라벨도 동일 silent drift 잔존.
3. **관측 부재**: console.error 로깅은 PR #372 추가됨. 하지만 Cloudflare Workers 환경에서 console.error → Sentry alert 배선 미확인. silent 흘러감.

## Impact

- **모델 성능 측정 무효**: v1.8 가중치 효과 (head_to_head 축소 + elo 증가) 검증 불가. n=99→150 임계 가속 가설 깨짐.
- **사용자 가시 가치 약화**: AI reasoning 텍스트 = "에이전트 토론 불가" + "정량 모델 v1.8 결과 사용" 표시. 사용자 가시 UI 영향 (reasoning 노출 여부 검토 필요).
- **DB 라벨 오염**: pre_game mv='v2.0-debate' (5/13) + postview mv='v2.0-postview' (5/13) — 둘 다 실제 LLM 호출 0회. /accuracy 페이지의 model_version별 분석 왜곡.

## Solution (후속 fix-incident heavy chain 권장)

1. **ANTHROPIC API key 상태 확인**: Vercel env / Cloudflare Worker secret 의 ANTHROPIC_API_KEY 잔여 credit + HTTP 인증 직접 테스트.
2. **postview path agentsFailed 가시화**: `packages/kbo-data/src/agents/postview.ts` + `pipeline/postview-daily.ts` 에 PR #372 와 동일 패턴 적용 — mv='v2.0-postview' silent 라벨링 차단.
3. **observability 강화**: agentsFailed=true 시 Sentry captureException 직접 호출 (현재 console.error 만). Cloudflare Workers cron 환경에서 console 흐름 확인.
4. **/accuracy 페이지 가시화**: model_version 안 quant-only fallback 비율 표시 — 사용자가 "오늘 예측이 실제 에이전트 토론 결과인지" 알 수 있게.

## Reusability

LLM API 호출 의존 ML 파이프라인 일반:
- **silent fallback 라벨 분리**: fallback 결과 row 와 정상 결과 row 의 model_version 분리 필수. 같은 라벨로 저장하면 성능 측정 영구 오염.
- **token=0 detection**: API 응답 token usage 측정 = silent 실패 가장 빠른 detection 신호. 비용 모니터 외에 활용 가능.
- **batch 중간 failure 패턴**: API credit 소진 = batch 중간부터 실패 (5/12 5건 중 4-5번째 부터). 일괄 retry 보다 batch-level 가시화 우선.

## 박제 위치

- 본 lesson (`docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md`)
- cycle 383 retro (`policy:` commit subtype=cycle-retro)
- TODOS.md v1.8 데이터 신뢰성 경고
- 후속 fix-incident heavy chain (다음 cycle 자연 redirect)

## 관련

- PR #372 (cycle 362): agentsFailed 플래그 — pre_game 만 가시화. postview 미수정.
- CLAUDE.md 드리프트 사례 6 (관측 인프라 silent 실패): 본 사례 = 동일 family.
- cycle 359 retro: "v1.8 첫날 파이프라인 정상(window_too_early = 예정 동작)" — 예측 fire 이전 진단이라 fallback 발견 못함. 정상 보고가 silent drift 은폐.

---

## 후속 evidence — cycle 387 (2026-05-14 16:00 KST)

### Label 강등 검증 PASS

5/14 07:18 UTC (16:18 KST) pre_game fire 5건 → 모두 `model_version='v1.8'` (강등 라벨) + `scoring_rule='v1.8'` + `confidence=0.30`.

cycle 386 PR #415 (final-reasoning.ts agentsFailed/agentError 박제) + 기존 model-version.ts `determineModelVersion()` 가 함께 작동 = label silent drift 완전 차단 검증됨.

| 시점 | mv 라벨 | 의미 |
|---|---|---|
| 2026-05-13 (PR #372 머지 이전) | `v2.0-debate` | silent drift — debate 실패해도 정상 라벨 |
| 2026-05-14 (PR #372 머지 이후) | `v1.8` | 정정 — debate 실패 시 fallback 라벨 자연 표시 |

### Root cause 2일째 미해결

5/13 ~ 5/14 = 10 fire 전부 quant-only fallback. ANTHROPIC_API_KEY credit 또는 인증 상태 변화 X. Label 강등 fix (downstream) 만 적용되고 ROOT cause (credit) 는 user action 대기 중.

**필요 action (user)**:
1. Vercel + Cloudflare Worker 의 ANTHROPIC_API_KEY env 값 확인 — 잔여 credit / 만료 여부
2. 직접 API 호출 테스트 (`curl https://api.anthropic.com/v1/messages -H "x-api-key: $KEY" ...`)
3. credit 충전 또는 키 재발급

본 cycle (387) = lesson 박제 + carry-over `memory: subtype=needs` dispatch. fix-incident chain 자율 발화 불가 (root cause = 외부 SaaS credit, 코드 fix 영역 X).

### v1.6 anomaly 추가 발견 (cycle 387 측정, op-analysis heavy 후속 후보)

v1.6 scoring_rule n=46 (2026-04-22~05-03):
- 전체 17/46 = **37.0%** (coinflip 50% 이하 13%p)
- high conf (≥0.55) n=14: 5/14 = 35.7%
- low conf (<0.55) n=32: 12/32 = 37.5%

12일 span 양쪽 conf bucket 모두 random 이하 → v1.6 가중치 자체가 역방향 신호 가능성. v2.0 가중치 후보 (TODOS.md) 와 비교 시 v1.6 의 sp_fip 15% / lineup_woba 15% 가 의심 영역. n=150+ 도달 후 op-analysis heavy 에서 v1.5/v1.6/v1.7-revert/v1.8 era 별 factor weight backtest 권장.
