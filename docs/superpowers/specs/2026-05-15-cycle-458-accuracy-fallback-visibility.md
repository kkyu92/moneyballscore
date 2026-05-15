# cycle 458 — /accuracy fallback 비율 + AI reasoning 사용자 가시화

**cycle**: 458
**chain**: explore-idea (lite)
**trigger**: improvement saturation 12/15 (review-code/fix-incident/polish-ui/info-arch ≥ 12) → 신규 product direction 점검 신호
**carry-over**: TODOS.md "v1.8 silent fallback 발견 (긴급)" + W22 운영 노트 "후속 fix-incident heavy chain 권장" + `docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md`
**status**: draft (사용자 review 대기)
**target_chain**: fix-incident (heavy) 또는 polish-ui (heavy) — 다음 사이클 후속

## 배경

W22 (5/11~) ANTHROPIC_API_KEY credit 소진으로 v1.8 fire 전체 quant-only fallback (5/13~). 잔존 운영 현실:

1. credit 복구 = 외부 SaaS 영역 사용자 action 필요 (코드 fix 불가)
2. **잔존 가시화 갭**: 사용자가 fallback 상태인지 모르고 reasoning 한 줄 ("에이전트 토론 불가. 정량 모델 v1.8 결과 사용.") 만 봄
3. `/accuracy` 페이지 = 적중률/Brier/캘리브레이션 표시. **fallback 비율 표시 없음**
4. `/analysis/game/[id]` / 홈 / `/predictions/[date]` AI reasoning 노출 path에 fallback 상태 명시적 라벨 없음

→ 사용자가 모델 성능 해석 시 v1.8 가중치 효과 측정과 quant-only fallback 결과를 구분 불가. silent quality drift.

## Scope

### A. `/accuracy` 페이지 신규 섹션 — "AI 토론 사용률"

- predictions 테이블 직전 30일 fetch
- `totalTokens > 0` (debate 정상 fire) vs `totalTokens = 0` (fallback) 분류
- 일별 stacked bar — 토론/fallback 비율
- 누적 % 표시 (예: "최근 30일 중 토론 정상 18%, quant-only 82%")
- 분기 reasoning: "ANTHROPIC_API_KEY credit 소진 시 quant-only 모델로 fallback. 모델 성능 평가 분리 필요."

### B. AI reasoning 노출 path fallback 라벨

- `JudgeReasoningCard.tsx` (predictions 카드 reasoning)
- `BigMatchDebateCard.tsx` (홈 빅매치)
- `AgentArgumentBox.tsx` / `JudgeVerdictPanel.tsx` (/analysis/game/[id])

각 component 에 fallback 식별 분기:
- `prediction.totalTokens === 0 && reasoning.includes('정량 모델') ` → 별도 배지 "🤖 quant-only" + tooltip "AI 토론 일시 중단 (credit 영역)"
- 정상 토론 = 배지 없음

### C. Sentry captureException 직접 호출 (선택)

- `daily.ts` runDebate fallback catch path 에 Sentry direct capture
- tag: `agentsFailed=true`, `model_version`, `reason`
- alert rule = "5 events / 1h" → Telegram dispatch

### D. (선택) Cron daily-summary 알림 fallback 비율 표시

- Telegram daily summary 메시지 마지막 line "AI 토론 [N/M] 정상" 추가

## Out of Scope

- ANTHROPIC_API_KEY credit 충전/재발급 (사용자 영역)
- v1.8 가중치 측정 (credit 복구 후 자연 진행)
- fallback 모델 자체 개선 (quant 모델은 동작 중)

## 가치 / Trade-off

**가치**:
- 사용자 신뢰 차단 (silent quality drift → 명시적 라벨)
- 운영 metric 가시화 (fallback 비율 정량 측정)
- 다음 silent failure 시 즉시 발견

**trade-off**:
- /accuracy 페이지 무거워짐 (DB query 추가)
- component fallback 분기 매번 prediction 데이터 의존
- Sentry alert 노이즈 가능 (cooldown 필수)

## Next Cycle 후속 후보

1. **fix-incident (heavy)**: B + C 구현 (사용자 가시 라벨 + Sentry direct)
2. **polish-ui (heavy)**: A 구현 (/accuracy 섹션 + DESIGN.md 통합)
3. **explore-idea (heavy)**: 전체 A+B+C+D 묶음 (큰 호흡)
