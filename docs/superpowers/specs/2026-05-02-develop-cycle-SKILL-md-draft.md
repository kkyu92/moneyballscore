---
name: develop-cycle
description: 머니볼 프로젝트 디벨롭 1 사이클 (진단 → chain 선택 → 시퀀스 실행 → commit + PR → 회고) 을 N번 반복. 사용자가 `/develop-cycle [N=1]` 또는 "사이클 N번 돌려" 입력 시 시작. 각 사이클은 chain pool (fix-incident / explore-idea / polish-ui / review-code / operational-analysis / dimension-cycle) 중 메인 자유 추론으로 1개 선택. cycle_state JSON 으로 사이클 사이 풍부 carry-over. agent-loop 자율 cron (2026-04-30 폐기) 의 manual 후속.
---

# develop-cycle

머니볼 프로젝트 develop 사이클을 N번 반복. **메인 자유 추론 + chain pool** 기반. 사용자 직접 호출 + zero-touch 자동 다음 N 시작.

## 비전

> "스스로 상황에 맞게 스킬들을 활용하여 프로젝트 개선을 훌륭하게 작업해내는 것 — 사이클 1회 뿐만 아니라 N회까지 스스로 자동화"

- **Layer A (사이클 1회 안)**: 진단 → 상황 맞는 superpowers/gstack skill chain 자율 선택 + 실행
- **Layer B (사이클 N회 사이)**: zero-touch 자동 다음 시작 + cycle_state JSON 풍부 carry-over

## 사용

- `/develop-cycle` → N=1 (기본)
- `/develop-cycle 3` → 3 사이클 (사용자 권장 default)
- 자연어: "사이클 3번 돌려"

## chain pool — 도구상자 6개

매 사이클의 진단 결과 보고 메인 (Opus 4.7) 이 자유 추론으로 1개 선택. 룰 X. 새 chain 추가 = 본 table 한 행 추가.

| Chain | 적용 조건 (trigger) | 시퀀스 | 멈춤 조건 |
|---|---|---|---|
| `fix-incident` | 진단 = 버그/에러/silent 실패/regression | `/investigate` → 코드 수정 → `/ship` | PR 생성 + CI green 또는 root cause 미해결 |
| `explore-idea` | 진단 = 신규 기능 / 큰 방향 미정 / 자연 발화 새 product idea | `/office-hours` → `/plan-ceo-review` → `/plan-eng-review` → 구현 → `/ship` | spec/plan 박제 또는 사용자 reject |
| `polish-ui` | 진단 = UI 이슈 / 디자인 부채 / 디자인 일관성 균열 | `/plan-design-review` → `/design-review` → `/ship` | UI fix PR 또는 design system 박제 |
| `review-code` | 진단 = 코드 품질 / 테스트 부족 / 복잡도 누적 | `/health` → `/simplify` → `/review` → `/ship` | 품질 score 개선 또는 cleanup PR |
| `operational-analysis` | 진단 = 운영 데이터 분석 / 적중률 metric / 패턴 학습 | `/weekly-review` → `/extract-pattern` → `/compound` | 회고 박제 또는 lesson PR |
| `dimension-cycle` (legacy default) | 위 어디에도 안 맞음 | 기존 site/acquisition/model 차원 dispatch (Agent Teams 기존 디자인) | 기존 디자인 동일 |

### 책임 경계

- chain pool = 도구상자. 어떤 chain 들이 사용 가능한지 명시
- 선택 = 메인 자율 추론. 진단 결과 + chain pool 보고 자유 선택
- 실행 = chain sequence 직렬 호출 (Skill 도구 또는 Agent 도구). chain 안 sub-skill 실패 시 stop 조건 따라 회고

## 사이클 단계 1 — 진단

### 풀 스캔

CLAUDE.md "세션 시작 시 필수 스캔" 섹션 따름. 추가:

### 직전 3 cycle_state read

```bash
for n in $(($CYCLE_N - 1)) $(($CYCLE_N - 2)) $(($CYCLE_N - 3)); do
  cat ~/.develop-cycle/cycles/$n.json 2>/dev/null
done
```

각 파일에서 `chain_selected` + `execution.outcome` + `retro.summary` + `retro.next_recommended_chain` 추출. 다음 진단 input.

### 중복 chain 회피 신호

직전 3 사이클이 모두 같은 chain 이면 다른 chain 우선 (LLM 추론 input).

### key_findings 추출

scan + 직전 cycle_state 결과 보고 메인이 주목한 발견 list 박제. 다음 chain 선택의 근거.

## 사이클 단계 2 — chain 선택

### 메인 자유 추론

진단 결과 + chain pool table 보고 메인 (Opus 4.7) 이 자유 선택. 룰 X.

```
입력: 진단 key_findings + chain pool table + 직전 3 cycle_state
출력: chain_selected (slug) + chain_reason (선택 이유 자연어)
```

### default fallback

진단 결과가 chain pool 5개 (fix-incident / explore-idea / polish-ui / review-code / operational-analysis) 어디에도 안 맞으면 `dimension-cycle` (기존 차원 dispatch) 자동 선택.

### next_recommended_chain 힌트

직전 사이클 cycle_state.retro.next_recommended_chain 이 있으면 진단 input 으로 활용. 강제 X (메인 자율 결정 우선).

## 사이클 단계 3 — chain 시퀀스 실행

### 직렬 호출

선택한 chain 의 sequence 따라 skill 들을 순서대로 호출:

- 가벼운 step (단순 진단 / 단일 skill / 메인 컨텍스트 안 처리 가능) → Skill 도구
- 무거운 step (long horizon 작업 / context isolation 필요 / 병렬 작업) → Agent 도구

각 step 의 결과는 cycle_state.execution.skills_invoked / results 에 박제.

### chain stop 조건

각 chain 의 stop 조건 (chain pool table 참조) 도달 시 실행 종료. 결과는 outcome (`success` / `fail` / `partial`).

### commit + PR

chain 결과를 4 prefix (feat/fix/feedback/policy/lesson 등) 따라 commit + branch (`develop-cycle/<slug>`) + PR. R7 자동 머지 (CI green 후 squash + branch delete).

## 사이클 단계 4 — 회고

### cycle_state JSON write

`~/.develop-cycle/cycles/<n>.json` 작성. 스키마:

```json
{
  "cycle_n": 12,
  "started_at": "2026-05-02T11:00:00Z",
  "ended_at": "2026-05-02T11:45:00Z",
  "diagnosis": {
    "scan_summary": "git log 15개 / migration 021 / TODOS 5건 carry-over",
    "key_findings": ["...", "..."],
    "input_from_prev_cycles": ["cycle 11 chain=fix-incident outcome=success", "..."]
  },
  "chain_selected": "fix-incident",
  "chain_reason": "...",
  "execution": {
    "skills_invoked": ["investigate", "ship"],
    "results": {"investigate": "...", "ship": "..."},
    "outcome": "success"
  },
  "commit_hash": "abc1234",
  "pr_number": 45,
  "retro": {
    "summary": "...",
    "todos_added": ["..."],
    "next_recommended_chain": "operational-analysis",
    "next_recommended_reason": "..."
  }
}
```

### handoff carry-over 와 책임 분리

| 메커니즘 | 단위 | 위치 |
|---|---|---|
| handoff save | 세션 단위 | `~/.gstack/projects/<slug>/checkpoints/` |
| cycle_state | 사이클 단위 | `~/.develop-cycle/cycles/<n>.json` |
| git commit | 변경 단위 | git history |
| TODOS.md | 사용자 가시 | repo root |

### zero-touch signal file 작성

회고 박제 후 zero-touch signal file 작성 (변경 X, 기존 형식 그대로):

**정상 끝**:
```bash
cat > ~/.develop-cycle/signal <<EOF
$CYCLE_N
OK

$NEXT_N
EOF
```

**fail 끝**:
```bash
cat > ~/.develop-cycle/signal <<EOF
$CYCLE_N
FAIL
$REASON
0
EOF
```

`$NEXT_N` = 사용자가 처음 호출한 N 동일 (무한 반복) 또는 0 (정지). skill 자체가 결정.

## 실패 모드 & 안전장치

| 실패 | 안전장치 |
|---|---|
| chain pool 적용 조건 모호 | `dimension-cycle` 폴백 또는 신규 chain 박제 (다음 PR) |
| chain 안 sub-skill 실패 | cycle_state outcome=`fail` + retro 에 fail reason + 다음 사이클 회피 신호 |
| cycle_state JSON write 실패 | handoff save 호출 (안전망). zero-touch signal 은 OK 박제 |
| 메인이 chain 선택 잘못 | 사용자 끼어들기로 next_n=0 박제 (zero-touch stop) |
| 직전 cycle_state read 실패 (파일 없음 / 손상) | input_from_prev_cycles = [] 빈 배열 |
| 동일 chain 3회 연속 | LLM 추론 input 으로 다른 chain 우선 |

## 호환성

- 기존 차원 사이클 = `dimension-cycle` chain 으로 등록. 첫 시범 fire (PR #31 site) / 2nd fire (model n47) 형태와 동일
- zero-touch signal file 포맷 변경 X
- handoff carry-over 와 cycle_state 책임 분리

## 컨텍스트 60% 도달 시

handoff save 자동 제안 + 잔여 cycle carry-over. 메인 자가 추정 (대화 turn + 도구 호출 + system reminders) + 사용자 % 알림 양쪽 사용 (사용자 알림 우선).
