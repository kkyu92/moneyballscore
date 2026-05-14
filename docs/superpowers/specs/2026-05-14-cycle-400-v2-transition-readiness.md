---
cycle: 400
chain: explore-idea (lite, spec-only)
status: draft (사용자 review 대기)
created: 2026-05-14
related:
  - docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md (cycle 383)
  - docs/superpowers/specs/2026-05-13-cycle-350-skill-evolution-pass204-milestone.md
  - TODOS.md "v2.0 가중치 후보" 표 (cycle 231 재검토)
---

# v2.0 transition readiness — credit recovery 후 v1.8 누적 → n=150 임계 → v2.0 가중치 전환 메커니즘

## 배경

cycle 335 (2026-05-12) v1.8 시작 — `DEFAULT_WEIGHTS` head_to_head 5%→3% + elo 8%→10% 박제. 그러나 cycle 383 (2026-05-14) 발견: 5/13 v1.8 era 첫 fire 부터 모든 예측 quant-only fallback (ANTHROPIC_API_KEY credit 소진). cycle 384~386 ship 으로 label 강등 (mv='v1.8' 정정) 완료, 하지만 **v1.8 가중치 효과 측정 불가** (credit 복구 시점까지).

cycle 397 (2026-05-14) operational-analysis lite — n=99 무변동, credit silent fallback persistent. v2.0 임계 n=150 까지 51건 잔여.

## 문제 정의

ANTHROPIC credit 복구는 외부 영역 (사용자 action). 복구 시점 + 그 이후 v1.8 가중치가 실제로 효과 있는지 측정 절차가 **현재 정의되어 있지 않음**:

1. credit 복구 후 v1.8 가중치 효과 측정 시작 시점 = 첫 LLM 토론 fire 인가, 누적 일정 건수 이후인가
2. v1.8 누적 n=150 임계 도달 자동 검출 메커니즘 부재 — 사용자가 직접 measurement query 돌려야 함
3. v2.0 가중치 후보 (TODOS 표) 적용 시점 = 자동인가 manual ship 인가
4. v1.8 era 자체가 fallback 으로 오염된 n=5 (cycle 387 기준) 포함 — 측정 시 era 분리 필요

## 목표

cycle 400 milestone 시점에 다음 3 단계 transition path 박제:

### Phase A — credit recovery 검출 (사용자 action 후 자동 활성화)

**trigger**: 사용자가 Vercel/Cloudflare env ANTHROPIC_API_KEY credit/만료 충전·재발급 → 다음 daily-pipeline cron fire (predict mode) 시 LLM 토론 자동 부활.

**자동 검출 channel**:
- `/accuracy` 페이지 fallback rate widget (cycle 384 PR #413 추가됨, 이미 노출). 일별 fallback 비율 7일 sparkline.
- recovery 검출 = 최근 7일 fallback rate 가 100% (전부 fallback) 에서 <100% 로 break.

**구현 무관 — observability 만 갱신**:
- (이미 존재) `/accuracy` fallback rate 표시
- (옵션) Sentry custom event `ai-debate-recovery` — 처음 non-fallback row 감지 시 1회 dispatch. 사용자가 telegram alert 받음. **본 cycle 구현 X — Phase B 진행 시 같이 검토**.

### Phase B — v1.8 era 측정 시작 시점 정의

**측정 데이터셋 정의**:
- `scoring_rule = 'v1.8'` AND `totalTokens > 0` (fallback 제외) AND `is_correct IS NOT NULL` (verified)
- cycle 387 기준 n=5 v1.8 row 모두 totalTokens=0 (fallback) → **본 5건 측정 대상 제외**
- credit recovery 후 첫 LLM 토론 fire row 부터 v1.8 era 진짜 누적 시작

**측정 임계**:
- n=30 — 초기 sanity check (v1.8 가중치가 v1.7-revert 대비 +5%p 이상 또는 -5%p 이하 변동 시 alert)
- n=50 — 가중치 효과 가시화 시작 (Brier / accuracy 95% CI 좁아짐 시점)
- n=150 — v2.0 결정 가능 임계 (cycle 387 TODOS 표 기준)

**측정 query draft** (`docs/sql/v18-era-measurement.sql` 박제 예정):

```sql
-- v1.8 era 진짜 누적 측정 (fallback row 제외)
SELECT
  COUNT(*) AS n,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::float / COUNT(*) AS accuracy,
  AVG(POWER(home_win_prob - CASE WHEN actual_winner=home_team_code THEN 1 ELSE 0 END, 2)) AS brier
FROM predictions
WHERE scoring_rule = 'v1.8'
  AND total_tokens > 0
  AND is_correct IS NOT NULL;
```

### Phase C — v2.0 가중치 ship 결정 기준

**조건 모두 충족 시**: v2.0 PR draft 작성 + 사용자 review:

1. v1.8 era 진짜 누적 n ≥ 150
2. v1.8 accuracy ≥ 52% (coinflip 대비 +2%p) — 가중치 자체가 망가지지 않았는지 sanity
3. TODOS v2.0 후보 표 (cycle 231 분석) 의 정보가치 Δ 가 v1.8 era 데이터 backtest 로 재확인 (operational-analysis heavy mode 1 cycle 발화 필수)

**ship 시점 PR 구성**:
- `packages/shared/src/index.ts:104` DEFAULT_WEIGHTS 갱신
- `packages/kbo-data/src/pipeline/daily.ts:691` scoring_rule='v2.0' 박제
- `packages/kbo-data/src/pipeline/postview-daily.ts:204` 동일
- `packages/shared/src/index.test.ts` weight sum 1.0 + 10 키 + 0~1 범위 테스트 유지
- DESIGN.md / TODOS.md v2.0 era 박제

**ship 후속**:
- cycle 335 v1.8 → cycle XYZ v2.0 transition 박제 (`memory:` subtype=cycle-retro 또는 `policy:` subtype=cycle-retro)
- v2.0 era 측정 임계 n=30/50/150 동일하게 적용 (v2.1 가능성 대비)

## non-goal

- credit 자체 복구 (외부 영역 — 사용자 action)
- v1.8 가중치 자체 미세 조정 (전체 v2.0 전환에서 한꺼번에)
- DEFAULT_WEIGHTS 의 cycle 별 회귀 (v1.5/v1.6/v1.7-revert) 보존 — git history 충분, 코드 path 박제 X

## 사용자 review 항목

- [ ] Phase B 측정 임계 n=30/50/150 자연한가
- [ ] Phase C ship 조건 #2 (accuracy ≥ 52%) sanity threshold 자연한가
- [ ] Phase A 의 Sentry custom event `ai-debate-recovery` 필요한가 (현재 `/accuracy` widget 으로 충분 가정)
- [ ] 본 spec 의 헤비 backtest 단계 (TODOS 정보가치 Δ 재확인) 를 operational-analysis heavy chain 으로 1 cycle 자율 발화 OK 인가

## 다음 cycle 후속 후보

- Phase A 검출 fire 시 cycle 마다 `/accuracy` widget 확인 (자율 진단 source 갱신)
- credit recovery 검출 즉시 → 새 cycle 진단 단계에서 자연 발화 (`fix-incident` 또는 `operational-analysis lite`)
- v1.8 era n=30 도달 시 → operational-analysis lite 자동 sanity
- v1.8 era n=150 도달 시 → 본 spec Phase C 진입 (자율 PR draft)
- 본 spec 의 SQL query `docs/sql/v18-era-measurement.sql` 박제 (lite spec write 후속)

## evidence

- cycle 335 (2026-05-12) v1.8 시작 — `packages/shared/src/index.ts:104` head_to_head 0.03 + elo 0.10
- cycle 383 (2026-05-14) v1.8 era silent fallback 발견 — `docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md`
- cycle 384~386 ship — mv='v1.8' label 정정 PR #413/#414/#415
- cycle 387 (2026-05-14) operational-analysis lite — v1.8 n=5 모두 fallback (totalTokens=0)
- cycle 397 (2026-05-14) operational-analysis lite — n=99 무변동, credit silent fallback persistent
- TODOS.md v2.0 가중치 후보 표 (cycle 231 재검토, 2026-05-07) — `elo` +0.30 (최강) / `bullpen_fip` +0.26 / `recent_form` +0.20 / 4개 ↑ / 6개 ↓
- `/accuracy` fallback rate widget — cycle 384 fix-incident heavy PR #413 (이미 노출)
- `/debug/model-comparison` page 존재 (apps/moneyball/src/app/debug/model-comparison)
