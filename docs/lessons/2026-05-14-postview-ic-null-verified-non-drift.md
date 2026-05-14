# postview prediction row `is_correct` NULL — verified non-drift

**날짜**: 2026-05-14 (cycle 393, operational-analysis lite)
**유형**: false-positive 가설 차단 lesson

## 관찰

`predictions` 테이블 model_version='v2.0-postview' row **101건 전체** `is_correct = NULL`. v2.0-debate (pre_game) row 110건 중 99건 정상 채워짐 (49/50/11). 표면 패턴 = silent drift 의심.

## 결론

**의도된 design — drift 아님**.

`packages/kbo-data/src/pipeline/daily.ts:1218` verify 단계가 `prediction_type='pre_game'` 만 select:

```ts
const predResult = await db
  .from('predictions').select('id, game_id, predicted_winner')
  .eq('prediction_type', 'pre_game')   // ← postview 제외
  .in('game_id', finalGames.map((g) => g.id));
```

`postview` 책임 = 사후 factor-level attribution (정성적 분석). pre_game 의 적중 verify 책임은 pre_game row 만 진다. 1 게임 = pre_game row 1건 + postview row 1건, is_correct verify 는 pre_game 만.

## 의도

- pre_game row = 사전 예측 / 가중치 검증 / 적중률 metric source
- postview row = 사후 분석 / agent-memory 학습 input / factor-error 측정 source

verify 두 row 모두 채우면 적중률 metric 이 중복 카운팅 (2배) 됨. postview NULL 유지가 정합.

## 향후 진단 차단

postview NULL 패턴 발견 시 본 lesson 재read → drift 의심 X.

silent drift 새 가설 평가 흐름:
1. 패턴 식별 (postview 101건 ic=NULL)
2. 코드 path 확인 (verify select 범위)
3. design 의도 추정 (책임 분리)
4. 본 lesson 참조 — 의도 검증된 패턴이면 종결
