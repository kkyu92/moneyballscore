---
topic: KBO 데이터 파이프라인 노이즈 필터링 강화 — 진단 + 후보 mitigation 정리
source_issue: 2145
source_link: hub-dispatch Scout 2026-06-24 (geeknews "노이즈 병목: 더 많은 정보라는 미묘한 함정")
cycle: 1353
target_chain: explore-idea (lite — spec only, partial)
status: spec_only_pending_user_review
---

## Origin

[hub-dispatch issue #2145](https://github.com/kkyu92/moneyballscore/issues/2145) — Scout 데일리가 감지한 generic direction. "데이터가 많아질수록 신호 비중 감소 → 모델/사람 모두 상황 파악 악화". 본 spec = 현 파이프라인의 노이즈 source 진단 + 후속 cycle 후보 정리. lite mode 이므로 코드 변경 X, spec only.

## 현재 noise mitigation 박제된 layer (grep evidence)

| layer | 위치 | 효과 | 잔존 risk |
|---|---|---|---|
| 소표본 hedge 임계 | `packages/shared/src/index.ts:514` `SMALL_SAMPLE_N = 5` | 표본 < 5 시 "참고용" hint 박제 | 임계 단일값 (5). 도메인 (팀/선수/구장/심판) 별 differentiated 임계 부재 |
| 홈/원정 split 임계 | `packages/kbo-data/src/pipeline/prediction-history.ts:12` `HOME_AWAY_MIN_SAMPLE = 10` | 표본 < 10 시 split 결과 skip | 홈/원정 차원 only. 다른 split (vs 좌투/우투 / vs 동일 리그) 동일 logic 부재 |
| factor anomaly 임계 | `packages/shared/src/index.ts:955` `FACTOR_ANOMALY_MIN_SAMPLE = 5` | 표본 < 5 시 anomaly 평가 skip | factor 별 임계 일괄 5 — 갱신 빈도 다른 factor (FIP vs WAR) 동일 임계 |
| 0% weight factor 차단 | `packages/kbo-data/src/agents/postview.ts:62, 330` | LLM prompt 안 weight=0 factor 자동 제거 (reasoning noise 차단) | postview 차원 only. predictor 차원 동일 logic 부재 |
| factor bias bootstrap CI | `packages/kbo-data/src/pipeline/factor-bias-bootstrap-ci.ts` | bootstrap resample CI 측정 → wide CI factor 신뢰도 낮춤 | run 빈도 (사용자 수동 / cron 부재). 결과 → 가중치 자동 반영 X |
| silent drift alert | `packages/kbo-data/src/pipeline/silent-drift-alert.ts` | predictions=0 + games_found>0 mismatch Sentry warning | predict_final cohort family only. 다른 cohort drift 미감지 |

## 잠재 noise source (현 파이프라인 진단)

### 1. 데이터 수집 차원 — scraper noise

- **KBO 공식**: HTML/AJAX 응답 안 광고 banner / promotional text 가 paragraph 분리 boundary 흐림. 현재 cheerio selector 가 specific class 만 잡지만 KBO 측 markup 변경 시 silent drift 위험 (사례 8 KBO `/ws/Main.asmx` Referer 봇 차단 family 정합)
- **Naver schedule / Naver record**: 동일 경기에 대해 KBO 공식 vs Naver 결과 불일치 가능 (e.g. 우천 노게임 시점 차이). cross-validation layer 부재
- **FanGraphs / Fancy Stats**: 시즌 중 retroactive 갱신 발생 — 전일 박제값과 다음날 박제값 silent diff 가능 (cohort versioning 부재)

### 2. feature engineering 차원

- **상대전적 (head_to_head)**: cycle 335 박제 — W20/W21 noise 측정 → weight 5→3% 축소. 다른 factor 동일 noise 측정 미수행 (FIP/xFIP/wOBA/recent_form/WAR/elo/park/sfr 등 9개)
- **recent_form**: 직전 N=10 경기 평균. window 크기 = 모든 팀/시즌/시점 동일. heteroskedasticity (분산 비동질성) 미반영 (e.g. 선발 로테이션 변경 직후 5경기 vs 안정기 5경기 noise 차이)
- **park_pf (구장 보정)**: park factor 갱신 주기 = 시즌 단위 cohort. 한 구장 안 weather/시간대/관중 차원 noise 미포함 (factor 자체가 long-run mean 만 capture)

### 3. agent reasoning 차원

- **judge-agent reasoning length**: LLM 답변 안 "확률 vs 자연어 추론" mismatch — 사후 validator 가 factor mention 부재 catch 하지만 reasoning **자체**의 hedge 정도 (e.g. "두 팀 모두 강하지만..." 류 vague phrasing) quantification 부재 → confidence calibration noise
- **postview 0% factor noise**: 이미 차단됨 (위 표 ✓). 다음 layer = LLM 이 "weight=2%" 같은 약 factor 를 reasoning 안 dominant trait 처럼 묘사하는 inverse noise. 사후 validator soft warning 부재
- **rivalry-memory window**: cycle 별 누적 retro 가 memory pool size 무한 증가 → LLM context 안 stale memory noise. eviction policy 부재

### 4. operational analysis 차원

- **predictions 분석 cohort 분리**: cycle 819 silent_drift_alert 도입 후 predict_final cohort family 측정 OK. 다른 cohort (pre_game / postview / shadow / mlb) 동일 silent drop alert 미설치
- **agent_memory 학습 소스**: cycle 1xxx 박제 — `is_correct=false` 만 학습. correct 사례의 "정확한 추론 path" 학습 누락 (절반의 신호 폐기). cycle 의 retro.ts 동작 정의이지만 본 spec scope 확장 후보

## 후속 cycle 후보 (heavy spec 진입 trigger)

| 후보 | scope | 1 cycle 안 처리 가능? | priority (자가 의심 차단 룰 정합 — rubric 적용) |
|---|---|---|---|
| A. cohort drift alert 확장 | pre_game / postview / shadow / mlb 각 silent_drift_alert 확장 (현 predict_final only) | yes (lite 코드 4 추가, 운영 가시 즉시) | Tier 1 — fix-incident heavy 차원 자연 fire 가능 |
| B. factor 별 noise 측정 harness | head_to_head 5%→3% 패턴을 9개 factor 에 일반화. bootstrap CI + W측정 cron + 결과 → 가중치 후보 박제 | partial (harness add 1 cycle, 측정 run 별도 cycle, 가중치 결정은 ~~n=150+ 도달 후~~ **v1.8 유지 확정 후 소멸 — cycle 1460**) | ~~Tier 3 — operational-analysis heavy 차원, n=150 도달 (v2.0 trigger) 동기~~ **cycle 1460 갱신: v1.8 유지 확정 (Brier < 1pp) 으로 v2.0 trigger 소멸. 가중치 re-fit = 소진된 카드 (v2.1-B reject evidence). 본 후보 = archive** |
| C. recent_form window heteroskedasticity 측정 | 선발 로테이션 안정/불안정 split + 5경기 window noise variance 측정. variable window 후보 도출 | no (1 cycle 안 측정 + 결과 검증 어려움) | ~~Tier 3 — n=150 v2.0 후속~~ **cycle 1460 갱신: v2.0 후속 소멸 — 본 후보 = archive (사용자 발화 시 재개)** |
| D. LLM hedge phrase quantification | postview reasoning text 안 "강하지만/약하지만" 류 vague phrase 카운트 → confidence calibration noise 측정 | yes (regex + reasoning sweep harness, 1 cycle) | Tier 2 — review-code heavy 또는 op-analysis heavy 자연 fire |
| E. rivalry-memory eviction policy | memory pool size cap + LRU/TTL eviction 도입. context noise 축소 | yes (단순 cap, 1 cycle) | Tier 2 — fix-incident heavy 또는 review-code heavy 자연 fire |
| F. agent_memory correct 학습 path 박제 | retro.ts 가 is_correct=true 사례의 reasoning path 도 학습 source 로 추가 | partial (logic 변경 + 측정은 별도) | Tier 2 — explore-idea heavy 후속 spec 분리 |

## 자가 검증 rubric

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  baseline_noise_layers_present: 6  # 위 표 1
  baseline_noise_sources_diagnosed: 4 카테고리 × 3~6 sub = 약 20 candidate
  rubric_evaluation: |
    가치: medium — 노이즈 mitigation 누적 = Brier 개선 가능성 + LLM reasoning quality 향상. ~~단 v1.8 cohort n=27 / acc 48.1% baseline 에서 노이즈 mitigation 효과 directly measurable 까지 n=150+ 필요~~ **cycle 1460 갱신: v1.8 유지 확정 (n=161 crossed, Brier < 1pp) — Tier 1/2 후보 A/D/E 만 유효, Tier 3 후보 B/C/F 는 archive**
    시간 비용: small (spec write 1 cycle) — heavy 진입 시 후보 별 1~3 cycle 추가
    risk: 1 — spec only, 코드 변경 X. heavy 진입 시 후보 별 risk 별도 평가
    자율 가능: partial — spec 박제 = 본 메인 자율 OK. heavy 후속 = 자율 (Tier 1/2) 또는 사용자 review 우선 (Tier 3)
    의존성: 단일 — 사용자 review (이 direction 정렬 OK 여부). ~~v2.0 cohort n=150 도달 동기 (Tier 3 후보들)~~ **cycle 1460 갱신: v2.0 cohort 동기 소멸 — Tier 3 후보 archive**
```

## 다음 cycle 후속 후보

1. **A (cohort drift alert 확장)** = 다음 fix-incident 차원 자연 fire 시 1 cycle 안 ship 가능. trigger source 명확 (silent drop risk).
2. **E (rivalry-memory eviction)** = review-code heavy / fix-incident heavy 차원 자연 fire 시 1 cycle 안 ship 가능.
3. **D (LLM hedge phrase quantification)** = postview text 차원 review-code heavy 자연 발화 시 1 cycle 안 ship 가능.

## 사용자 review wait

본 spec 은 lite mode 결과 — partial outcome. 사용자가:
1. Direction 정렬 OK + 다음 cycle 후보 A/D/E 중 1+ 본 메인 자율 fire 권한 → 후속 cycle 에서 자연 heavy 진입
2. Direction 정렬 X 또는 scope 조정 → 본 spec rewrite or archive
3. ~~v2.0 cohort n=150 도달 wait (Tier 3 후보 B/C/F) → 본 spec 보관, n=150 도달 cycle 자동 매핑~~ **cycle 1460 갱신: v1.8 유지 확정으로 v2.0 wait 소멸 — Tier 3 후보 B/C/F archive. 사용자 발화 시 재개**
