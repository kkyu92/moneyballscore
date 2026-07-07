# cycle 1155 explore-idea (lite) — v1.8 → v2.0 가중치 전환 spec draft

> **⚠️ STALE (cycle 1460 결정 후)** — v1.8 유지 확정 (2026-07-06). v2.0 전환 없음. 본 spec의 n=150 fire trigger / 가중치 후보 / transition plan 전체 superseded. v2.1-B rejected (Brier 0.4635). 가중치 re-fit 불필요 확정.

**chain**: explore-idea (lite)
**trigger**: 직전 15 cycle saturation 12/15 (review-code 6 + fix-incident 3 + polish-ui 2 + info-arch 1) + explore-idea last fire cycle 1139 (16 cycle ago)
**mode**: lite — spec write only (carry-over evidence + v1.8 cohort 데이터 기반 priori)
**status**: ~~draft (n=150 fire trigger 도달 시 final 확정 path)~~ **SUPERSEDED — v1.8 유지 확정 (cycle 1460)**

---

## 데이터 baseline (cycle 1138 cohort, 2026-06-10)

- v1.8 (real, pre_game) **n=76** / **acc=59.2%** / **Brier=0.2478** — cycle 1098 n=42 → +34 누적 (9일 / 3.4 / day, n=150 ETA 2026-07-01 잔여 74 / 약 21일)
- v1.8-credit-fail n=25 / acc=60.0% / Brier=0.2304 (frozen, 별도 cohort 분리)
- v2.0-shadow n=5 / acc=60.0% / Brier=0.5616 — ⚠️ 백필 아티팩트 (debate_version=null, accuracy/page.tsx 미오염 확인)
- v2.1-B-shadow n=52 / acc=51.9% / Brier=0.4635 — ⚠️ 백필 아티팩트, 라이브 행 verified 대기

### confidence tier (전체 n=254)

| tier | n | acc |
|---|---|---|
| low | 169 | 52.1% |
| mid | 53 | 54.7% |
| **high** | **32** | **65.6%** |

### v1.8 × tier heatmap

| rule | low | mid | high |
|---|---|---|---|
| v1.8 | 53% (32) | 60% (25) | **68%** (19) |

**high tier signal 강함**: low 53% → high 68% (+15pp gap). confidence gating 작동 input.

---

## v1.8 현행 가중치 (10 factor, 85% sum)

| factor | weight | 정보가치 baseline (cycle 335 기준) |
|---|---|---|
| 선발FIP | 15% | strong |
| 선발xFIP | 5% | mid |
| 타선wOBA | 15% | strong |
| 불펜FIP | 10% | strong |
| 최근폼 | 10% | mid |
| WAR | 8% | mid |
| 상대전적 | **3%** | weak (W20/W21 noise, 37.5% 실측) |
| 구장보정 | 4% | weak |
| Elo레이팅 | **10%** | strong (Δ=+0.30 최강) |
| 수비SFR | 5% | mid |

**합 85%** — 15% 잔여 = (1) HOME_ADVANTAGE=1.5% 상수 + (2) 미지정 잉여 (regression intercept / baseline class prior).

---

## v2.0 후보 direction (n=150 도달 시 최종 확정 input)

### Direction A: Elo 우위 강화 (정보가치 evidence 따름)

| factor | v1.8 | v2.0-A | Δ |
|---|---|---|---|
| Elo | 10% | **13%** | +3pp |
| 선발FIP | 15% | 15% | 0 |
| 타선wOBA | 15% | 15% | 0 |
| 불펜FIP | 10% | 10% | 0 |
| 선발xFIP | 5% | 4% | -1pp |
| 최근폼 | 10% | 9% | -1pp |
| WAR | 8% | 7% | -1pp |
| 상대전적 | 3% | 3% | 0 |
| 구장보정 | 4% | 4% | 0 |
| 수비SFR | 5% | 5% | 0 |

**근거**: cycle 335 정보가치 측정 Elo Δ=+0.30 최강. v1.7→v1.8 전환 시 8%→10% 이미 +2pp 인상. v1.8 n=76 시점 acc 59.2% 안정 후 v2.0 Elo 추가 인상 ROI 가설.

**리스크**: Elo 단일 모델 의존성 증가. KBO Fancy Stats Elo 소스 외부 의존 → silent drift family 재확장 위험.

### Direction B: high tier weight 보정 (confidence × accuracy 강한 신호 활용)

confidence tier 별 가중치 조정 X — 모든 tier 동일 weight 유지. 대신:

- **신뢰도 산정 자체에 Elo Δ 강화 항 추가**: confidence = f(selected_factor_count, factor_volatility, **elo_delta_magnitude**)
- 현행 confidence 계산식 (apps/moneyball/src/lib/predictor.ts) 안 elo_delta_magnitude 가중치 인상

**근거**: high tier 68% 신호 강함 → confidence 산정이 신호 분리 양호. 단 mid tier 60% / low tier 53% 분리도 보강 = elo_delta magnitude 기반 confidence 인상 시 mid/low tier 재분류 → 평균 acc 인상 기대.

**리스크**: confidence 산정식 변경 = 전체 cohort 재분류. v1.8 데이터 baseline 동결 후 v2.0 fire 직후 1-2주 confidence shift 적응 기간 필요.

### Direction C: 약 factor 제거 + 강 factor 재분배 (parsimony)

| factor | v1.8 | v2.0-C | Δ |
|---|---|---|---|
| 상대전적 | 3% | **0%** | -3pp (제거) |
| 구장보정 | 4% | 3% | -1pp |
| 선발FIP | 15% | 16% | +1pp |
| 타선wOBA | 15% | 16% | +1pp |
| Elo | 10% | 12% | +2pp |
| (나머지 동일) | | | |

**근거**: 상대전적 W20/W21 noise 실측 (37.5%). 구장보정 weak. parsimony 원칙 — 약 factor 제거 후 강 factor 재분배.

**리스크**: factor 제거 후 missed signal 가능성. n=150 시점 검증 후 점진적 제거 (v2.0-C-staged: 3%→1%→0% 3 cycle 동안 단계 제거 = data drift smoothing).

---

## 자가 검증 rubric (cycle 887 plan #8 박제 패턴 적용)

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  baseline_n: 76
  baseline_brier: 0.2478
  baseline_high_tier_acc: 0.656
  fire_trigger_n: 150
  fire_eta: "2026-07-01"
  자가_의심_차단: "n=76 결정 X / spec draft only. n=150 도달 시 사용자 결정 input"

direction_A:
  가치: medium  # Elo +3pp 인상 ROI 정보가치 evidence (Δ=+0.30) 명확
  시간_비용: small  # predictor.ts weight 라인 5-10 수정
  risk: 2  # Elo 단일 의존성 증가 + 외부 소스 의존
  자율_가능: partial  # n=150 도달 후 사용자 확정 결정 + 본 메인 직접 fire
  의존성: 단일  # n=150 도달

direction_B:
  가치: medium  # high tier 68% 신호 활용 가능성
  시간_비용: medium  # confidence 산정식 변경 + 전체 cohort 재분류
  risk: 2  # confidence shift 적응 기간 필요
  자율_가능: partial
  의존성: 단일

direction_C:
  가치: low  # 약 factor 제거 ROI 미측정
  시간_비용: small  # weight 재분배 단순
  risk: 1  # 점진적 제거 (3→1→0) 시 noise 흡수
  자율_가능: yes
  의존성: none
```

**Tier 분류 후**:
- Direction C = **Tier 1** (small + light + 자율 가능 yes) → n=150 도달 시 첫 fire 후보
- Direction A = **Tier 2** (medium + 자가 검증 후) → C ship 후 1-2 cycle 안정 확인 후 추가 fire 후보
- Direction B = **Tier 3** (medium + 의존성 단일) → Direction A ship 후 후속 plan 분리

---

## 다음 cycle 후속 후보

1. **n=150 도달 시 (~2026-07-01)** — v1.8 cohort final freeze + v2.0-C 첫 fire 결정. fire 시 본 spec body 안 Direction C 그대로 step 진입.
2. **n=100 도달 시점 (~6월 중순)** — 본 spec draft re-read + Direction C/A/B re-evaluate. v1.8 acc/Brier velocity 패턴 보존 시 spec 변경 X / 패턴 break 시 spec 재작성.
3. **백필 cohort (v2.0-shadow + v2.1-B-shadow) 라이브 행 verified** — debate_version=null 백필 행 별도 cohort 분리 유지 + 라이브 행 누적 evidence 분리 측정.

---

## 박제 명단

- `apps/moneyball/data/op-analysis-cohort/2026-06-10-cohort-cycle-1138.md` (data baseline)
- `apps/moneyball/src/lib/predictor.ts` (v1.8 가중치 산정 위치 — Direction A/C fire 시 직접 edit target)
- 본 spec — n=150 도달 시 final 확정 path

---

**carry-over**: 본 spec = draft only. n=150 도달 시 사용자 결정 + 본 메인 직접 fire path. carry-over evidence 명확.
