# Fable 검토 플랜 — 2026-07-06

**출처**: claude-fable-5 (2026-06-09 GA) 검토 결과  
**생성**: 2026-07-06 세션  
**목적**: Brier drift 대응 + 자동화 안정화. 세션 간 carry-over 기준 문서.

---

## 현황 스냅샷 (2026-07-06 기준)

| 항목 | 값 |
|---|---|
| 예측 엔진 | v1.8 (10팩터, 동결) |
| cohort n | 174 (pre_game, verified) |
| overall Brier | 0.3000 |
| pre(n=118) Brier | 0.2730 CI=[0.2427, 0.3024] |
| post(n=56) Brier | 0.3568 CI=[0.3087, 0.4058] |
| CI overlap | NO → 통계적 유의성 있음 |
| drift onset | idx≈86~93 → 2026-06-13~06-16 경 |
| confidence 상황 | post 56건 중 54건 low (mid=1, high=1) — tier 거의 증발 |
| coin-flip baseline | 0.25 — **post 0.3568 여전히 초과** |
| v2.1-B | rejected (Brier 0.4635) |

### Fable 핵심 진단
1. post Brier > 0.25(동전) = systematic bug or miscalibration. 점진적 노후화 X
2. tier collapse 전 tier 공통 → 가중치 문제 아님. v2.1-B 참패가 증거
3. 가중치 re-fit 은 **소진된 카드**. v2.0 = Platt scaling (calibration) 방향

---

## 플랜 + 진행 상태

### 단기 (이번 주)

| # | 항목 | 상태 | 메모 |
|---|---|---|---|
| S1 | backfill-home-win-prob.ts 실행 → drift 재측정 | ✅ 완료 (2026-07-06) | 10행 업데이트. post 0.3723→0.3568 |
| S2a | Elo pre/post Brier 대조 | ✅ 완료 (2026-07-06) | **Elo Δ=-0.0011 (안정)**: 리그 환경 변화 아님. 파이프라인 문제. |
| S2b | idx=90 날짜(2026-06-14~16) ↔ git log 대조 | ✅ 완료 (2026-07-06) | **코드 버그 가설 약화**: onset 구간 commits = SEO fixes only. 예측 로직 변경 없음. cycle 1205(2026-06-16) Brier=0.2588(n=90) 아직 정상. |
| S2c | post 구간 factor 입력 freshness 검사 | ✅ 완료 (2026-07-06) | **CREDIT_EXHAUSTED 2026-06-06~**: conf=0.3 fallback 96.4% → winner-centric Brier artifact. 실제 모델 이상 없음 |
| S3 | watch.sh heartbeat — cycle 종료 Telegram ping | ⏳ 미착수 | last-heartbeat stale >2h → GH Action alert |

### 중기 (2~4주)

| # | 항목 | 상태 | 메모 |
|---|---|---|---|
| M1 | CF Worker → Sentry 직접 연결 | ⏳ 미착수 | console.error → Sentry captureException |
| M2 | Platt scaling calibration (v2.0-lite) | ❌ **취소** | S2a 결과: 모델 calibration 이상 없음. home_win_prob Brier 0.24 stable |
| M3 | Brier 산정 단일 모듈화 | ✅ 완료 (2026-07-06) | brier.ts 신규 + op-analysis home_win_prob 전환 + daily.ts errors 직렬화 버그 수정 |

### 장기 (S2 결과 조건부)

| 분기 | 조치 |
|---|---|
| Elo 정상 + onset=코드 변경 | bug fix → v1.8 유지 + M2 Platt. v2.0 재설계 취소 |
| Elo도 악화 (리그 변화) | rolling re-fit + Platt + Elo 앙상블 |
| 공통 | confidence tier → calibrated prob 기준 재정의 |

---

## v2.0-lite 설계 (Platt Scaling)

```
Stage 1: v1.8 10팩터 score  ← 동결, 변경 없음
Stage 2: p_cal = sigmoid(a · logit(p_raw) + b)  ← 파라미터 2개
         주 1회 rolling window (최근 verified ~100) 재적합
```

**왜 Platt인가**: a<1 이면 0.5 방향 자동 수축 (현재 과신 교정). a=0 이어도 Brier=0.25 보장.  
**isotonic X**: n<200 과적합 위험.

**Elo 앙상블 (선택, Platt 이후)**:
```
p = α · p_v18_cal + (1−α) · p_elo   ← α rolling fit
```

**promote 조건 (v2.1-B 방식 재발 방지)**:
- shadow 운영 verified n≥30 연속 구간
- Brier < v1.8 **AND** Brier < 0.25 (둘 다 통과)
- temporal split only (random split 금지)
- 단일 window 일괄 평가로 accept/reject 금지

---

## S2 판별 실험 가이드

### S2a: Elo baseline 대조
```sql
-- predictions 테이블에서 elo_win_prob 컬럼 (있다면)
-- 또는 kbofancystats Elo 예측과 actual 결과 비교
SELECT
  CASE WHEN row_number() OVER (ORDER BY verified_at) <= 118 THEN 'pre' ELSE 'post' END as segment,
  AVG(POWER(elo_win_prob - CASE WHEN home_team_won THEN 1.0 ELSE 0.0 END, 2)) as brier
FROM predictions WHERE scoring_rule = 'v1.8' AND prediction_type = 'pre_game'
GROUP BY 1;
```

### S2b: onset ↔ git log
```bash
# 2026-06-13~06-16 사이 커밋
git log --oneline --after="2026-06-12" --before="2026-06-17"
```

### S2c: factor freshness
```sql
-- post 구간 예측의 sp_fip, batter_woba 가 최신인지
SELECT predicted_at::date, 
  AVG(EXTRACT(EPOCH FROM (predicted_at - batter_stats_updated_at))/3600) as avg_staleness_h
FROM predictions WHERE scoring_rule = 'v1.8' AND predicted_at > '2026-06-13'
GROUP BY 1 ORDER BY 1;
```

---

## 자동화 상태 (2026-07-06 기준)

| 컴포넌트 | 상태 | 메모 |
|---|---|---|
| CF Worker cron | 정상 추정 (직접 확인 불가) | `wrangler tail` 로 검증 필요 |
| GH Actions 모니터링 | ✅ 전부 green | health-alert/runtime-error/deploy-drift |
| develop-cycle watch.sh | ✅ cycle 1444~1456 진행 | heartbeat 없어 단절 감지 불가 |
| Telegram | ✅ 3종 구조 운영 중 | announce/summary/results |

---

## S2b 결과 상세 (2026-07-06 실행)

onset 구간(2026-06-13~16) git log:
- SEO fix commits 연속 (opengraph/twitter card, wave 29~38)
- 예측 로직/파이프라인 변경 없음
- cycle 1205(2026-06-16): "12h fresh 부족" = op-analysis 재발화 noise guard (데이터 staleness 아님)

**시사점**: 코드 변경으로 인한 sudden bug 가설 약화. 점진적 degradation 또는 데이터 입력 staleness(S2c) 방향.
**추가 단서**: post 56건 중 54건 low confidence → confidence 분포 붕괴. 원인 미상.

---

## 최종 진단 요약 (2026-07-06 완료)

| 항목 | 결과 |
|---|---|
| Brier drift 원인 | **측정 오류** — winner-centric Brier에 conf=0.3 fallback 섞임 |
| 실제 모델 품질 | **정상** — home_win_prob Brier pre/post 0.24/0.24 (coin-flip 이하) |
| Elo 비교 | Elo Δ=-0.0011 (안정) → 리그 환경 변화 아님 |
| CREDIT_EXHAUSTED | **2026-06-06~지속** → debate 100% fallback → conf=0.3 |
| **필요 액션** | **Anthropic Plans & Billing 크레딧 충전** (사용자 직접) |

## 잔여 항목

| # | 항목 | 상태 |
|---|---|---|
| S3 | watch.sh heartbeat | ⏳ 미착수 |
| M1 | CF Worker → Sentry | ⏳ 미착수 |

## 다음 세션 시작 시 체크리스트

1. `git log --oneline -5` — 최근 사이클 확인
2. 이 파일 read — 잔여 항목 확인
3. Anthropic 크레딧 충전 여부 확인 → 충전됐으면 debate 재개 확인
4. S3(heartbeat): watch.sh + GH Action stale 감지
