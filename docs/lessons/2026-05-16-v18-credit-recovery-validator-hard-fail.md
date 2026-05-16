# 2026-05-16 v1.8 credit 복구 확인 + validator hallucinated_number:hard fail 패턴 (cycle 502)

## 요약

- **chain**: operational-analysis (lite)
- **trigger**: cycle 499/498 carry-over (v1.8 credit verification pending)
- **결과**: credit 복구 confirmed (totalTokens=9000). KT 홈팀 agent validator hard fail (수치 "98" hallucination) → agentsFailed=True → mv='v1.8' 강등 라벨 (PR #372 정상 작동)

## evidence

5/16 02:18 UTC (KST 11:18) game_id=4148 (KT@한화) 첫 fire:

| 필드 | 값 |
|---|---|
| predictions.model_version | `v1.8` (강등 라벨) |
| predictions.scoring_rule | `v1.8` |
| predictions.confidence | 0.58 |
| reasoning_jsonb.debate.totalTokens | **9000** ← credit 복구 확인 |
| reasoning_jsonb.debate.agentsFailed | true |
| reasoning_jsonb.debate.agentError | `validator: hallucinated_number:hard (주입 블록에 없는 수치 1개: 98)` |
| reasoning_jsonb.debate.awayArgument.reasoning | 한국어 풍부 (한화 정상 작동) |
| reasoning_jsonb.debate.homeArgument.reasoning | "정량 모델 기반 분석" (KT fail → fallback) |
| reasoning_jsonb.debate.verdict.reasoning | Sonnet judge 한국어 풍부 |
| reasoning_jsonb.debate.calibration | Sonnet 회고 한국어 풍부 |

대조 (5/13~5/15 credit-fail era):
- mv='v2.0-debate' (5/13, PR #372 fix 이전) 또는 mv='v1.8' (5/14/15 이후 강등 라벨)
- confidence=0.300 lottery
- reasoning 비어있거나 fallback 텍스트
- totalTokens=0

## 발견 (3건)

### 1. credit 복구 verified

- totalTokens=9000 (5/13~5/15 = 0). 사용자 충전 (2026-05-16 08:06 KST) 효과 첫 fire 시점 = UTC 02:18 (KST 11:18) = cron predict UTC 02 첫 trigger
- 강등 라벨 (mv='v1.8') 정상 작동 — PR #372 family fix 가 silent fallback 차단 + 실제 fail 시 라벨 노출 확인

### 2. validator hallucinated_number:hard — KT 홈 agent fail

- error 문자열: `주입 블록에 없는 수치 1개: 98`
- 의미: KT 홈팀 페르소나가 prompt 주입 stat 블록에 없는 숫자 "98" 을 hallucinate (출처 미상). validator strict 모드 (NODE_ENV=production) 차단 → fallback 텍스트 → agentsFailed=true
- 영향: KT 측 argument 가 quant fallback ("정량 모델 기반 분석") 으로 대체. Sonnet judge 는 한화 측 풍부한 한국어 + quant 결과만 보고 verdict 도출 → confidence=0.58 정상

### 3. reasoning_jsonb root vs debate.verdict 모순

- root: `confidence: 0.027 / predictedWinner: 'KT' / homeWinProb: 0.46 / reasoning: 'KT 위즈 승리 예측 (51%)...'` (quant fallback 텍스트)
- debate.verdict: `confidence: 0.58 / predictedWinner: 'HH' / homeWinProb: 0.46 / reasoning: 'KT의 홈 어드밴티지...'` (한국어 풍부)
- predictions row column 값: `confidence=0.58`, `predicted_winner=8` (한화 team_id 추정)
- 즉 row column 은 debate verdict 따라가지만, reasoning_jsonb root 안에 quant fallback 잔존 = UI 노출 path 가 어느 쪽 읽는지 점검 필요 (potential silent drift family)

## 후속 후보 (carry-over)

1. **KT 페르소나 "98" hallucination 출처 추적** — `personas.ts` + KT-specific persona file (있다면) + 페르소나 4파일 주입 (v4-2) 어느 블록에 "98" 이 prompt 안 들어가는지 확인. 1회만 발생 시 transient noise. N≥3 재발 시 페르소나 수정 영역 발화 가능 (fix-incident lite)
2. **reasoning_jsonb root vs verdict 모순 UI path 점검** — `apps/moneyball/src/app/analysis/...` 와 `feed`, `predictions` 라우트에서 reasoning 읽는 코드 path grep — root 읽으면 quant fallback 노출 (사용자 가시 silent drift family). verdict 읽으면 정상
3. **다음 cron 정상 fire 검증** — 5/16 14:00 game 4148 KT@한화 + 다른 4 game UTC 03~06 사이 SP 확정 + predict fire 시 mv='v2.0-debate' / 'v2.0-postview' (정상) 또는 'v1.8' (강등) 비율 측정

## 정정 / R5 정신

- isolated smoke success ≠ 전면 verified. 본 fire 1건은 v1.8 credit 복구의 첫 evidence — n=1. 다음 4~5 fire 누적 후 정상 rate (mv='v2.0-debate' / 'v2.0-postview' 비율) 측정 필요. 다음 cycle 후속 operational-analysis lite 후보

## 참조

- `docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md` — fallback 식별 lesson
- `CHANGELOG.md` W22 운영 노트 (2026-05-16 cycle 490) — 가중치 유지 결정
- PR #372 — silent fallback 차단 + 강등 라벨 fix
