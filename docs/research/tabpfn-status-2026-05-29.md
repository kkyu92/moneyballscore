---
created_at: 2026-05-29
cycle: 1049
updated_cycle: 1062
scout_issue: 1206
related_plan: 12
status: carry-over tracker (Step 1/2 evidence pack done, Step 3-5 user-domain wait, kill-switch ETA 2026-06-03)
---

# TabPFN Scout #1206 — Status (cycle 1049)

scout #1206 (2026-05-21 박제) carry-over status snapshot. plan #12 Step 1/2 evidence pack 박제 후 약 90 cycle 경과 — Step 3-5 user-domain 진행 부재 확인 + 다음 자율 fire 시점 박제.

## 1. 박제 evidence (자율 영역, 종료)

| Step | 산출물 | 박제 cycle | 상태 |
|---|---|---|---|
| 1 | `docs/research/tabpfn-feasibility.md` (5축 적합성 평가 + Tier 3 분류) | 955 | DONE |
| 2 | `docs/research/tabpfn-data-prep.md` (CSV schema + Python skeleton placeholder) | 957 | DONE |

본 doc = Step 1/2 closure 후 carry-over 추적 — 신규 자율 작업 X.

## 2. 사용자 영역 carry-over (gating)

| Step | 내용 | gating | ETA |
|---|---|---|---|
| 3 | Python sidecar 인프라 4 옵션 결정 (Vercel Python Fluid Compute / HuggingFace API / Self-hosted FastAPI / ONNX export) | 사용자 결정 | TBD (v1.8 n=150 도달 후 권장) |
| 4 | TabPFN checkpoint download (~200MB) + verification | 사용자 영역 | Step 3 후 |
| 5 | v2.0 A/B test harness production fire | v1.8 n=150 + 사용자 결정 | ~2026-08-04 (n=150 ETA) |

## 3. v1.8 cohort progress (gating evidence)

- 측정 baseline: cycle 989/994 (2026-05-26) — n=27 / accuracy 48.1% / velocity 1.80/day / pre_game cohort only
- 갱신 측정: cycle 1038 (2026-05-29) — n=27 변동 0 (11 cycle cluster time gap, real time ≤ 4시간)
- **fresh baseline: cycle 1061 (2026-05-29) — n=205 total, v1.8 cohort split 신규 등장**:
  - v1.8 main: n=27 / acc 44.4% / Brier 0.2487
  - v1.8-credit-fail: n=25 / acc 60.0% / Brier 0.2304 (best of v1.8 family)
  - **v1.8 real (main + credit-fail): n=52** — credit-fail subset +15.6pp 우수 (mechanism 이 prediction quality 보존 evidence)
- kill-switch fire 조건: cohort_n ≥ 60 + accuracy 2pp+ 하회 + 3회 연속 (cycle 949~ 박제, `docs/research/v2.0-killswitch.md`)
  - **kill-switch threshold ETA**: real n=52 → n=60 까지 잔여 8건, 추정 2026-06-03 (~5일)
  - v1.8 main 44.4% vs v1.7-revert baseline 55.9% = **-11.5pp 하회 (1회 누적)** — 3회 연속 도달 시 kill-switch fire
- n=150 ETA: 2026-08-04 (보수 추정 유지, velocity 1.80/day 가정 — cohort split 신규 등장은 분류 진화이지 prediction generation rate 변동 X)

## 4. 본 cycle 결정 (explore-idea lite)

- 본 메인 자율 fire X — plan #12 Step 3-5 = 사용자 영역, v1.8 n=150 gating
- issue #1206 close 결정 X — carry-over 추적 채널 유지 (user-decision wait 명확화)
- 신규 코드 / 신규 plan slot 박제 X — Step 1/2 evidence pack 충분

## 5. 다음 자율 fire 조건 (자가 의심 차단)

- **v1.8 real n=60 도달 임박 (잔여 8건, ETA ~2026-06-03)** → kill-switch evidence check (operational-analysis chain 자연 fire trigger). v1.8 main -11.5pp 하회 1회 누적 → 추가 2회 연속 시 kill-switch fire 조건 충족
- v1.8 cohort n=150 도달 시 v2.0 결정 시점 진입 → 사용자 결정 wait (Step 3 사용자 결정 후 본 메인 Step 4-5 자율 영역 진입)
- 사용자 자연 발화 ("TabPFN" / "v2.0" / "tabular model") 시 본 doc 박제 evidence 안내

## 6. 참조

- plan #12 Step 1 evidence: `docs/research/tabpfn-feasibility.md`
- plan #12 Step 2 evidence: `docs/research/tabpfn-data-prep.md`
- v2.0 kill-switch: `docs/research/v2.0-killswitch.md`
- v1.8 cohort baseline: `docs/research/v1.8-cohort-baseline.md`
- scout #1206 (2026-05-21): original carry-over evidence
- `feedback_data_only_claims` — Brier/LogLoss/적중률 측정 숫자 의무
- `project_moneyball_current_state` — n=94 → n=27 v1.8 cohort 정정 (cycle 989 측정)
