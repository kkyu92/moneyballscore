# Anti-Pattern: Silent LLM Fallback Masking

**카테고리**: anti_pattern  
**발견**: cycle 1400 operational-analysis (2026-06-27)  
**기간**: 2026-06-06 ~ 현재 (22일 이상 미감지)  
**파일**: `packages/kbo-data/src/agents/debate.ts`

## 문제

```typescript
// debate.ts
const verdict = judgeResult.data || {
  homeWinProb: quantitativeProb,
  confidence: 0.3,          // ← 항상 0.3 (fallback)
  reasoning: '에이전트 토론 불가. 정량 모델 결과 사용.',
  predictedWinner: quantitativeProb >= 0.5 ? homeTeam : awayTeam,
};
```

`judgeResult.data` 가 null 일 때 fallback 이 작동. 파이프라인은 정상 종료 (pipeline_runs.status = 'success', errors = []) — 사용자와 운영자 모두 이상 감지 불가.

## 증상 (22일간 감지 안 된 이유)

- `pipeline_runs.errors = []` — 파이프라인 성공 처리
- `predictions` 행 정상 삽입 (winner, game_id 모두 정상)
- **단서**: `confidence = 0.3` exactly — 모든 최근 예측 동일값
- DB 집계 쿼리로만 발견: `SELECT DISTINCT confidence FROM predictions WHERE model_version='v1.8' ORDER BY game_id DESC LIMIT 30`

## 원인

`evaluateAndCaptureAgentFallback()` 은 이미 호출되지만 Sentry `captureException` 연결이 없거나 production 환경에서 silent fail. LLM API 호출 자체가 실패 (judgeResult.success=false) 하지만 debate.ts 는 이를 정상 fallback 으로 처리.

## 해결 방향

```typescript
// 1. fallback 발화 시 명시적 Sentry alert
if (!judgeResult.data) {
  await captureAgentFallbackAlert({
    agent: 'judge',
    gameId: context.game.externalGameId,
    error: judgeResult.error,
  });
}

// 2. confidence=0.3 flat 모니터링 — 연속 N건 시 Sentry warning
// silent-drift-alert.ts 에 추가 분기
```

## 교훈

1. **LLM-in-pipeline 에서 `data || fallback` 은 항상 anti-pattern** — fallback 발화 = 명시적 alert 필수
2. **confidence 분포 모니터링** — 단일값 고착은 fallback 신호
3. `pipeline_runs.errors = []` 는 "파이프라인 정상" 이지 "LLM 정상" 이 아님
4. **탐지 쿼리**: `SELECT DISTINCT confidence, COUNT(*) FROM predictions WHERE model_version='v1.8' GROUP BY confidence ORDER BY COUNT(*) DESC`

## 임팩트

- 22일간 모든 예측 = 순수 정량 모델 (LLM 토론 없음)
- 이번 주 75% 성과 = 정량 모델 단독 성과 (의도치 않은 ablation study)
- v1.8 confidence 분포 오염 (n=117 중 대다수가 0.3 flat)
