# cycle 46 — skill-evolution: fix-incident chain stop 조건 강화

**date**: 2026-05-04 KST
**cycle**: 46 (skill-evolution chain 첫 자동 발화)
**trigger**: skill-evolution-pending 마커 (cycle 45 박제, trigger #5: 직전 20 사이클 chain 1개 0회 발화)

## 갱신 영역 — fix-incident chain stop 조건 강화

### Before

```
| `fix-incident` | 진단 = 버그/에러/silent 실패/regression | `/investigate` → 코드 수정 → `/ship` | PR 생성 + CI green 또는 root cause 미해결 |
```

### After

```
| `fix-incident` | 진단 = 버그/에러/silent 실패/regression | `/investigate` → 코드 수정 → `/ship` | PR 생성 + CI green + (실측 fire 1회 PASS 또는 사용자 자연 발화 검증) 후 success 박제. isolated smoke 단독 = success 박제 X (R5 정정 5건 누적, cycle 45 meta-pattern, cycle 46 skill-evolution) |
```

## 근거 — R5 정정 5건 누적 패턴 (cycle 45 meta-pattern)

| # | 사이클 | 거짓 박제 | 정정 시점 | 차단 fix |
|---|---|---|---|---|
| 1 | cycle 25/26 | "watch.sh fire 검증됐다" | cycle 33 | PPID chain |
| 2 | cycle 39+40 | "base PR 자동 fire 작동" | cycle 41 | fire 시퀀스 |
| 3 | cycle 41 | "fire 시퀀스 검증됐다" | cycle 42 first fire 21:42 | hotfix 진행 |
| 4 | cycle 42.5 hotfix | "smoke + SIGINT survival 통과" | cycle 42.5 22:06 second fire | (cycle 43 본 fix) |
| 5 | cycle 42.5 ensure_session | "session 검증 충분" | cycle 43 본 진단 | pane wrapper 검증 |

### 공통 메커니즘

- isolated smoke = 환경 격리 + 단일 명령 측정 = 실제 사용자 환경 (mcc wrapper / 기존 tmux pane / 누적 state) 미반영
- 본 메인이 "smoke PASS = fix 충분" 자가 신뢰 → 실측 fire 환경에서 fail 발견
- 사용자 자연 발화 ("또 종료됐어 / 1+2+3 자동? / 한거야?") 만 가짜 신뢰 차단 가능

## 본 갱신의 작동

### 새 룰 적용 시나리오 (cycle 47+)

1. **fix-incident chain 진행** → /investigate → 코드 수정 → /ship → PR + CI green
2. **이전 (Before)**: 여기서 success 박제. R5 정정 패턴 위험 (smoke만으로 끝)
3. **이후 (After)**: PR + CI green 까지는 동일. 그러나 success 박제 = (a) 실측 fire 1회 PASS 또는 (b) 사용자 자연 발화 검증 ("작동한다 / 끝났다 / 잘 돌아간다") 둘 중 1건 필요

### 검증 신호 source

- (a) **실측 fire 1회 PASS**: develop-cycle 자동 chain의 다음 사이클에서 자동 fire가 fail 없이 통과 (예: cycle 43 fix → cycle 45 자동 spawn PASS)
- (b) **사용자 자연 발화 검증**: 사용자가 결과를 사용해 보고 작동 여부 발화 (예: cycle 32 "feed 작동한다")

### partial outcome 박제 (smoke만 PASS, 실측 fire / 사용자 검증 부재)

```json
{
  "execution": { "outcome": "partial (smoke PASS, 실측 fire 또는 사용자 검증 대기)" }
}
```

다음 사이클이 partial outcome 발견 시 = 같은 영역 fix-incident chain 회피 (회귀 차단). 다른 chain 우선.

## cycle 45 진짜 PASS 사례 (본 갱신의 first 적용 case)

cycle 43 fix (PR #85, 6fb873d) = isolated smoke + 실측 fire 1회 PASS 박제 = **본 갱신의 first PASS 적용 사례**:

- isolated smoke: tmux 'smoke' socket 4 시나리오 PASS (absent→spawn / wrapped→OK / raw cat→ABORT / raw sleep→ABORT)
- 실측 fire: 22:42:33 watch fire 본 cycle 45 spawn (pane_pid=49172 comm=bash, send-keys fail 0건)
- 사용자 자연 발화 검증: "어쩌라는거지 책임없는 회피아니냐" — 사용자 자연 발화는 본 fix 의 작동 자체에 대한 검증 X (다른 영역). 단 실측 fire 1회 PASS 만으로 success 박제 가능.

## 본 갱신의 가치

R5 정정 패턴 6번째 차단. 본 메인이 cycle 47+ 매 fix-incident chain 진행 시 가짜 신뢰 차단.

## 주의 — 본 갱신은 success 박제 룰 변경

- isolated smoke 만 PASS → success 박제 X (이전엔 가능했음)
- 사용자가 N=37 호출 후 잠 → 본 메인이 cycle 47~82 자율 진행 → 매 fix-incident chain 시 새 룰 적용 → 실측 fire 또는 사용자 자연 발화 부재 시 partial 박제 → 사이클 chain 다양성 자연스럽게 증가 (회귀 차단)

## carry-over (다음 갱신 후보)

본 cycle = 단일 영역 집중 갱신. 다음 skill-evolution 발화 후보:
- 0회 발화 chain (explore-idea / polish-ui / dimension-cycle / design-system) trigger source 강화
- 진단 source 균형 룰 (직전 5 사이클 같은 chain 3+회 시 다른 chain 우선)
- 본 cycle 47+ 누적 데이터 보고 결정
