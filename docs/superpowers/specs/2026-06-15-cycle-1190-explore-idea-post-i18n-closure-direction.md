# cycle 1190 explore-idea (lite) — post-i18n-closure 전략 방향 spec

**chain**: explore-idea (lite)
**trigger**: saturation 12/15 (review-code 11 + fix-incident 1 in last 15) + explore-idea last fire cycle 1164 (26 cycle ago)
**mode**: lite — spec write only (자동 fire 환경 office-hours skip + 메인 자율 추론 + carry-over evidence 기반)
**status**: draft (사용자 review 후 next direction 결정 input)

---

## carry-over evidence

### 1. i18n silent leak family wave 22~28 closure (7 consecutive review-code heavy cycles)

| wave | cycle | scope |
|---|---|---|
| 22 | 1178 | /en/mlb twitter card |
| 23 | 1183 | /en/mlb/games openGraph |
| 24 | 1184 | KBO /mlb subroutes openGraph + twitter |
| 25 | 1185 | KBO default 5 routes openGraph + twitter |
| 26 | 1186 | KBO /mlb/games dynamic routes openGraph + twitter |
| 27 | 1188 | predictions/[date] JSON-LD inLanguage ko-KR |
| 28 | 1189 | /en/mlb 7 routes JSON-LD inLanguage en-US |

**closure 증거** (grep `inLanguage` + grep `locale:` 본 cycle 진단):
- KBO routes: `inLanguage: "ko-KR"` 박제 균일 (8 routes)
- /en routes: `inLanguage: "en-US"` 박제 균일 (7 routes)
- openGraph locale: ko_KR (KBO) + en_US (/en) 균일

**잔여 silent leak 후보 0건** — wave 29 trigger source 부재. review-code (heavy) detection channel 자연 고갈 신호.

### 2. v1.8 cohort plateau (cycle 1166~1187 = 21 cycle stagnation)

| cycle | n | acc | Brier | velocity (/day) |
|---|---|---|---|---|
| 1166 | 76→90 | 59.2% | 0.2478 | +14 (2일 fresh) |
| 1173 | 90 stable | — | — | 0 |
| 1179 | — | — | — | 6 cycle 0 verified delta PARTIAL |
| 1181 | — | — | — | silent halt family wave 19 evidence |
| 1182 | — | — | — | PR #1971 verify mode wire-up + Telegram fallback fix |
| 1187 | 90 | 58.9% | **0.2588** | 0 (post-fix 여전 stagnant) |

**관찰**:
- n=90 stagnant 21 cycle (1166 → 1187, 약 4일)
- accuracy -0.3pp (59.2% → 58.9%)
- Brier +0.011 (0.2478 → 0.2588) — **악화**
- silent halt wave 19 fix (cycle 1182) 후 cycle 1187 측정 시 n 증가 0 = fix 효과 미확인 또는 다른 layer halt

**원인 가설 (검증 X, spec only)**:
- (H1) verify mode silent halt 추가 layer 남음 — PR #1971 wire-up 부분만 fix, Telegram fallback 만 보강. predict_final → verify routing 안 다른 silent layer 잔존
- (H2) 모델 적중률 자체 plateau — n=90 모집단 60%대 ceiling 도달, v1.8 capacity 한계
- (H3) 데이터 cohort 분리 issue — v2.0-shadow / v2.1-B-shadow 백필 아티팩트가 verified 행 누락 분기 차단

### 3. plan #18~21 status (carry-over 자율 영역 풀-수렴)

- plan #18 (cross-vendor outage): doc_only_shipped_cycle_1039_pending_user_step_b (사용자 영역 wait)
- plan #19 (Footer wireframe + 메가메뉴): all_steps_shipped_cycle_1042_1043_1044_1046 (수렴)
- plan #20 (Header 메뉴 압축): all_steps_shipped_cycle_1064_pending_user_smoke (사용자 영역 wait)
- plan #21 (MLB 잔여 자율): completed_all_steps_shipped_cycle_1094 (수렴)

**자율 영역 신규 plan 후보 부재** (cycle 1064~1094 post-1000 batch 풀-수렴 후 자연 종료 패턴).

---

## post-closure direction 후보 (사용자 review input)

### Direction A: v1.8 plateau 진단 + silent halt 추가 layer detection

**가설**: cycle 1166 → 1187 = 21 cycle n=90 stagnant + Brier 악화 = silent layer 잔존 가능성.

**chain 매핑**: fix-incident (heavy) + operational-analysis (heavy) tandem
- fix-incident: PR #1971 wire-up 이후 predict_final → verify → results upsert chain trace 점검. silent layer wave 20 후보 식별 (verify timezone? agent_memories sync? results aggregation?). evidence 박제 → root cause fix → smoke fire 1회 PASS
- operational-analysis (heavy): n=90 plateau capacity ceiling 가설 vs silent layer 가설 분리 — 본 cycle 1187 후 며칠 wait 후 n=90 변동 측정 + verify_logs grep. data 결정 = ceiling 또는 silent layer

**ROI**: high (모델 capacity 측정이 v2.0 trigger 핵심. plateau 진단 부재 시 v2.0 fire timing 결정 불가)

### Direction B: review-code (heavy) detection channel 후속 source 탐색

**가설**: i18n silent leak family wave 22~28 closure 후 detection source 자연 고갈. 다음 silent drift family wave 후보 부재 = 새 detection source 식별 필요.

**candidate detection sources** (spec only):
- (1) sitemap.xml URL 수 vs page.tsx 실제 수 mismatch (정적 라우트 박제 누락)
- (2) robots.txt allow/disallow vs hub 라우트 일치 (SEO drift)
- (3) DESIGN.md token (color/spacing) vs 실제 Tailwind config mismatch (design system drift)
- (4) migration .sql 박제 vs 실제 Supabase REST 조회 schema mismatch (drift case 9 family 후속)
- (5) ESLint config 안 unused rule 박제 vs 실제 lint output 0 mismatch (dead rule)

**chain 매핑**: review-code (heavy) 자체 + 신규 detection source 1개 (grep harness) 박제

**ROI**: mid (review-code 가 detection channel 안 자연 fire 가능한 source 보장. but 본 explore-idea 후속 cycle 신규 source detection 자동 fire 양도 — 본 spec scope 외)

### Direction C: lotto 차원 재발화 (자연 source 의존 + 30-cycle gap trigger 후보)

**가설**: 직전 lotto cycle 미확인. trigger 6 (30-cycle gap) 자체 자연 fire 가능.

**chain 매핑**: lotto (lite) — count_smoke + (있으면) 신규 회차 50세트 박제 + 직전 추첨 OOS 검증

**ROI**: low (lotto 영구 opt-out chain — explore-idea 본 chain 안 redirect 부적합. 본 spec scope 외)

### Direction D: explore-idea retro-only — saturation false positive

**가설**: 11 review-code 누적 = i18n silent leak family sweep dominance. dominance-positive streak 인정 룰 (cycle 135 박제) — 단일 chain 성공 streak ≠ 2-chain lock. saturation trigger 가 본 streak false positive.

**chain 매핑**: 본 cycle outcome=retro-only 박제. v2.0 가중치 확정 데이터 (n=150 도달) 대기.

**ROI**: low (carry-over 박제 명확 부재 시 retro-only 자연. 하지만 본 spec write 자체가 carry-over → next cycle direction A 또는 B input)

---

## 자가 검증 rubric (5축)

**Direction A**:
- 가치: high (v2.0 fire timing 결정 input)
- 시간 비용: large (heavy chain tandem, 1 cycle 안 수렴 불가)
- risk: 2 (silent layer 진단 → soft fix risk 가능)
- 자율 가능: yes
- 의존성: 단일 (cycle 1187 후 며칠 wait 후 n 변동 측정 의존)

**Direction B**:
- 가치: mid (review-code detection 자연 source 후보 박제)
- 시간 비용: medium (1 cycle 안 grep harness 1개 박제 가능)
- risk: 1 (light)
- 자율 가능: yes
- 의존성: none

**Direction C**:
- 가치: low (본 chain 외 redirect 부적합)
- 시간 비용: small
- risk: 0
- 자율 가능: yes
- 의존성: 외부 추첨 주기 (토 21:00 KST)

**Direction D**:
- 가치: low (saturation trigger 가 본 streak false positive 인정)
- 시간 비용: small
- risk: 0
- 자율 가능: yes
- 의존성: none

**추천**: Direction A 우선 (v1.8 plateau + silent halt wave 20 후보 진단). 본 cycle = explore-idea lite (spec write only), 후속 cycle 1191 부터 chain 자율 매핑 (fix-incident 또는 operational-analysis heavy).

---

## 후속 chain 자율 매핑 (next 3 cycle 예측)

- cycle 1191: fix-incident (heavy) — Direction A.1 silent halt wave 20 후보 식별 + root cause fix
- cycle 1192: operational-analysis (heavy) — Direction A.2 n=90 plateau capacity ceiling vs silent layer 분리 측정
- cycle 1193~ : 결과 따라 자유 chain 자율 (review-code redirect / explore-idea heavy fire / etc.)

**carry-over**:
- 본 spec → cycle 1191 진단 단계 input (saturation 12/15 trigger 잔존 OR 자연 해제 측정)
- v1.8 cohort n=90 plateau 검증 deadline: cycle 1195 시점 cohort snapshot 측정 vs 본 cycle baseline (n=90 / 58.9% / 0.2588)
