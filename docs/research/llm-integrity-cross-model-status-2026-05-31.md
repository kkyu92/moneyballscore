---
created_at: 2026-05-31
cycle: 1068
scout_issue: 1444
related_spec: docs/superpowers/specs/2026-05-04-llm-output-integrity-cycle25.md
related_pr: 69
status: carry-over scout (자율 영역 검토 closure, 사용자 결정 wait — 자율 ROI 낮음 결론)
---

# LLM 신뢰성 검증 강화 Scout #1444 — Status (cycle 1068)

scout #1444 (2026-05-29 박제) carry-over status snapshot. "프런티어 LLM 간 불일치 — 팩트체크 교차 검증" 긱뉴스 기사 도입 검토 — 본 cycle = 자율 영역 검토 closure + 사용자 결정 wait 명확화.

## 1. 박제 evidence (자율 영역, 종료)

### 1.1 현 프로젝트 LLM 신뢰성 layer 점검

`packages/kbo-data/src/agents/` 영역 read 결과 (validator.ts 700+ 줄 + judge-agent.ts + postview.ts + llm.ts):

| 신뢰성 요소 | 현 구현 | 위치 |
|---|---|---|
| Layer 1 결정론적 검증 | 환각 숫자 / 선수명 발명 / 금칙어 / claim-type 분류 불가 / low-weight factor 강조 | `validator.ts` `validateTeamArgument` / `validateJudgeReasoning` / `validateFactorAttribution` |
| 환각 숫자 임계 (LLM nondeterminism 보정) | 1~2개 warn 강등 / 3개+ hard reject (cycle 884) | `validator.ts` line 92-95 `HALLUCINATED_NUMBER_HARD_THRESHOLD=3` |
| 선수명 발명 차단 | strict=hard / lenient=warn (exaone 환각 허용치) | `validator.ts` `resolveValidationMode` |
| 사용자 가시 leak 차단 | `maskViolatedReasoning` (위반 reasoning 마스킹) | `validator.ts` 호출부 `judge-agent.ts` + `postview.ts` |
| Sentry tag silent drift 사전 감지 | `notifyValidationViolations` (warn 통과 case 도 Sentry capture, near-miss 가시화) | `validator.ts` line 659 |
| Validator event log (operational) | `logValidatorEvent` Supabase 박제 | `validator-logger.ts` |
| mode 분리 (prod 무조건 strict) | NODE_ENV=production 시 LLM_BACKEND=ollama 여도 strict 강제 | `validator.ts` `resolveValidationMode` |
| 역할별 모델 backend 분리 | `LLM_BACKEND_HAIKU` (team/postview/retro) vs `LLM_BACKEND_SONNET` (judge) — 비용 vs 품질 trade-off | `llm.ts` line 44-57 |

본 프로젝트 신뢰성 = **Layer 1 결정론적 검증 + Sentry silent drift 사전 감지 + maskViolatedReasoning** 3중 layer 운영 중. 기존 cycle 25 spec (`docs/superpowers/specs/2026-05-04-llm-output-integrity-cycle25.md`) + cycle 27 PR #69 (validateJudgeReasoning + Sentry tag) ship 완료 + cycle 884 threshold 보정 누적.

### 1.2 기사 claim 정합 평가 (cross-model 교차 검증)

기사 핵심 = "프런티어 LLM (GPT/Claude/Gemini 등) 들이 동일 사실에 대해 자주 disagree → 단일 LLM 출력 신뢰 위험". moneyball 정합 후보:

| 기사 패턴 | moneyball 현재 | 도입 ROI |
|---|---|---|
| 동일 prompt 다중 LLM 병렬 호출 + voting/disagreement detection | 단일 모델 호출 (역할별 분리만) | low — judge-agent reasoning 은 사용자 가시 본문 = 검증 가치 high, 그러나 비용 × 2 (Sonnet judge 호출 2회) + latency 2× + KBO 도메인 fact 가 "검증 가능한 사실" (선수 stat) 보다 "확률 판단" (10팩터 가중합) 중심 |
| LLM 간 disagreement = Sentry alert (자동 escalation) | 단일 LLM + Layer 1 validator only | medium — disagreement detection layer 추가 = 환각 숫자 / 선수명 발명을 정량 외 추가 axis 로 잡을 수 있으나, 현 Layer 1 validator 가 이미 KBO 도메인 fact (KBO_TEAMS 선수명) 결정론적 차단 + Sentry near-miss capture 운영 중 |
| Self-consistency (동일 LLM, temperature 변화 N회 sampling) | temperature 고정 (env: `LLM_TEMPERATURE` default) | low — 비용 × N + latency × N + judge reasoning 자유 텍스트 보장 X (각 sampling 마다 reasoning 표현 다름) |
| Fact-check 별도 verifier 모델 (cheap LLM 이 expensive LLM 출력 검증) | Layer 1 결정론 validator 가 fact (선수명 / 숫자) decisively 차단 | low — 결정론 layer 가 LLM verifier 보다 false positive ↓ + 비용 0 |

**결론**: 본 프로젝트 신뢰성 layer = 결정론적 validator + Sentry silent drift + maskViolatedReasoning 조합으로 작동 중. cross-model 교차 검증 layer 추가 = 비용 × N + latency × N + 현 Layer 1 validator 가 이미 KBO 도메인 fact 결정론 차단 (cross-model 의 noise 가능성 ↑ vs decisive ↓) + ROI 부족.

### 1.3 본 프로젝트의 결정적 차이 (기사 vs moneyball)

| 차원 | 기사 motivation (팩트체크) | moneyball judge-agent |
|---|---|---|
| 검증 대상 | 객관 사실 (날짜 / 인물 / 사건) — verifiable | 확률 판단 (홈팀 승률 0.15~0.85) — non-verifiable opinion |
| LLM disagreement 의미 | 둘 중 1개 wrong = 신뢰성 critical | 둘 다 valid opinion 가능 = disagreement 정상 |
| ground truth 존재 여부 | 외부 fact DB 비교 가능 | 경기 결과 only (사후 actual result) |
| 적중률 측정 method | LLM 응답 vs fact (즉시) | 경기 종료 후 verify mode (24시간 lag) |

기사 motivation = "동일 fact, 다른 답" 패턴. moneyball judge-agent = "동일 데이터, 다른 확률 판단" 패턴 (둘 다 valid). cross-model 교차 검증 = "둘 다 valid" 시 disagreement 가 silent skip 신호 X 가능 (false positive risk ↑). 본질적 fit mismatch.

### 1.4 잠재 도입 후보 — 부분 영역 (사용자 결정 시)

기사 정신 부분 차용 가능 영역 (전체 cross-model 아닌 narrow scope):

- **fact-only validator 추가** (선수 stat 검증): KBO Fancy Stats / FanGraphs scrape 시 LLM 가 새 선수 stat 생성 case 차단. 현 Layer 1 `invented_player_name` 이미 차단. 추가 ROI low.
- **postview 사후분석 cross-check**: 사후 factor attribution (어떤 factor 가 결정적이었나) 은 fact-leaning (외부 stat 비교 가능). cross-model 차이 시 Sentry warning 가능. ROI medium (postview = 사용자 가시 본문, 그러나 사후 분석 = 운영 cost 우선순위 medium).
- **judge-agent self-consistency check** (temperature 0.3/0.7 dual sampling): 동일 모델 두 번 호출 + reasoning text diff. KBO 도메인 자유 텍스트 = diff noise 高. ROI low.

## 2. 옵션 평가 (사용자 결정 영역)

| 옵션 | 정합도 | 사용자 결정 gating |
|---|---|---|
| A: 현 상태 유지 (Layer 1 validator + Sentry + maskViolatedReasoning) | high — 작동 + silent drift capture 박제 | **default 권장** — 추가 작업 X |
| B: postview 사후분석 cross-model 검증 layer 추가 (Haiku 1회 + Sonnet 1회 비교) | medium — postview reasoning 신뢰성 ↑ 가능, 그러나 운영 비용 × 2 (postview = 매일 모든 경기) | 사용자 결정 (postview 사용자 클릭률 데이터 누적 후 ROI 재평가) |
| C: 전체 LLM 출력 cross-model 교차 검증 도입 (judge + team + postview 모두 dual model) | low — 비용 × 2 + latency × 2 + judge 확률 판단 = "둘 다 valid" 정상 → disagreement noise 高 | 도입 권장 X (1.3 fit mismatch 블로커) |

## 3. 후속 carry-over (자율 영역 X)

- 사용자 결정 wait: 옵션 B 도입 시 trigger 조건 (e.g., postview Sentry near-miss ≥ 5건/주 누적 시 dual model)
- monitor: `notifyValidationViolations` Sentry tag warn 통과 case 누적 추세 — 현 운영 Sentry alert 채널에서 자연 가시
- cycle 25 spec (`docs/superpowers/specs/2026-05-04-llm-output-integrity-cycle25.md`) 재read 가치 — 기사 motivation 정합 부분 (Layer 2/Layer 3) 박제 evidence

## 4. issue close 권고

scout #1444 = high relevance 로 자동 분류됐으나, 본 cycle 분석 결과 = **기존 Layer 1 validator + Sentry layer 가 이미 기사 motivation 흡수**. 추가 자율 작업 ROI 부족 + 옵션 B/C 도입은 사용자 결정 영역. issue close 후 옵션 B trigger 조건 충족 시 신규 issue 열기 권고.
