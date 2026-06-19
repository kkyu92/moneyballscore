# LLM Agent Context Layer baseline (2026-06-19)

plan #23 Step 4 measurement harness baseline — `buildAgentContext` + `renderContextForLLM` 출력의 token budget (1200 limit) + hallucination 측정.

실측 LLM 호출 X — context layer 자체가 budget 안 들어가는지 확인용 시작점.

## sample 별 측정

| sample | chars | tokens (추정) | budget | ratio | within | hallucination rate |
|---|---|---|---|---|---|---|
| typical-LG-OB-잠실 | 993 | 398 | 1200 | 0.33 | ✅ | 0.000 (0/1) |
| SP-missing | 807 | 323 | 1200 | 0.27 | ✅ | 0.000 (0/1) |
| rivalry-HT-NC | 927 | 371 | 1200 | 0.31 | ✅ | 0.000 (0/1) |
| h2h-empty | 993 | 398 | 1200 | 0.33 | ✅ | 0.000 (0/1) |
| extreme-form | 991 | 397 | 1200 | 0.33 | ✅ | 0.000 (0/1) |

## 집계

- sample 수: 5
- 평균 token: 377
- max token: 398
- min token: 323
- 평균 budget ratio: 0.31
- 모든 sample budget 안: ✅

## 다음 측정 후속

- 실제 운영 agent (judge / postview / team / personas / debate / calibration / rivalry-memory) 통합 후 측정
- LLM 응답 cohort 수집 → `measureHallucinations` 실측 (synthetic X)
- v1.8 → v2.0 weight transition 후 weight 변화량 측정
- pre/post Brier delta (Context Layer 도입 전후) — Context Layer 통합 후 cohort wait

---

자동 생성 — plan #23 Step 4 baseline (cycle 1229).
