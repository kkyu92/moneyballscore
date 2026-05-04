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

### chain 별 진단 source 명시 (다양성 보강)

매 진단이 한쪽 source 만 보면 chain 편중 발생 (lesson v1: review-code 4/6 = lint output 만 본 결과). 6 chain 모두 균형 trigger 위해 각 chain 의 source 진단 시 균형 인지:

| Chain | 진단 source (어디 봐야 trigger 자연) |
|---|---|
| `fix-incident` | open GH issues (label `hub-dispatch` + bug/incident 류) / Sentry alert / Vercel deploy log / cron silent skip (`pipeline_runs` 최근 7일 gap) / `git log` debug commit / 사용자 incident 신고 |
| `explore-idea` | open GH issues (label `hub-dispatch` + scout/idea 류) / TODOS.md "Next-Up" / "사용자 영역" 자연 발화 후보 / `docs/superpowers/specs/` 미구현 idea draft / 자연 발화 product 의향 |
| `polish-ui` | open GH issues (label `hub-dispatch` + UI/design 류) / 사용자 UI 신고 / DESIGN.md vs 실제 컴포넌트 균열 / 모바일 layout 깨짐 / 디자인 시스템 inconsistency |
| `review-code` | open GH issues (label `hub-dispatch` + refactor/quality 류) / `pnpm lint` output / `pnpm test` 커버리지 / 큰 파일 (300+ 줄) 복잡도 / dead code / `health` score |
| `operational-analysis` | open GH issues (label `hub-dispatch` + metric/analysis 류) / `sp_log` 누적 / `pipeline_runs` metric / Brier / 적중률 / `agent_memories` 패턴 |
| `dimension-cycle` (legacy) | site/acquisition/model 차원별 metric (LCP / SEO / 적중률) — 위 5개 안 맞을 때 |

진단 단계가 위 6 source 카테고리 균형 있게 훑은 후 key_findings 추출. 한 source 만 깊이 파고 다른 source 안 본 경우 회피.

### 진단 source 우선순위 — open GH issues 우선 (N 무관 자동 처리)

매 사이클 진단 단계 첫 step:

```bash
gh issue list --state open --label hub-dispatch --limit 20
```

1. **open issue 있으면** → 그 중 1건 자율 선택 (issue body 보고 chain 매핑) → 사이클 진행. PR commit message 에 `Fixes #<num>` 박제 → R7 머지 시 자동 close
2. **issue 0 건 또는 직전 3 사이클이 같은 issue 영역 처리 후** → 기존 source (lint / Sentry / TODOS / metric) 진행
3. **N (사용자 호출 사이클 수) 와 issue 수 무관** — N=8 호출 시 open issue 5건 이면 5 사이클 issue 처리 + 3 사이클 기존 source 자연. 또는 N=3 호출 시 open issue 5건 중 우선 3건 처리

issue 처리 시 매핑 예:
- "PII 스크러빙" → `polish-ui` 또는 `fix-incident` (privacy fix)
- "레이스 컨디션 재검토" → `fix-incident`
- "kbo-cli 데이터 수집 강화" → `explore-idea`
- "DO_NOT_TRACK 텔레메트리" → `polish-ui` 또는 `fix-incident`

issue body + label 보고 메인 자율 결정. 룰 X.

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

## 컨텍스트 % 자가 판단 무시 (D-2 이후)

D-2 (zero-touch watch.sh 매 사이클 새 process) 적용 후엔 메인이 컨텍스트 % 자가 판단 **무시**. 이유:

- 매 사이클 끝 = signal 박제 → watch.sh 가 claude 종료 + 새 fresh process 시작 → 새 process 의 컨텍스트는 0% 부터 (system prompt + skill 캐시 로드만, conversation history X)
- 즉 사이클당 컨텍스트 누적 X = 자가 판단 자체 의미 없음

**규칙**:

1. 사용자가 N 명시한 만큼 매 사이클 진행. 메인 자가 "N 너무 많지 않나?" 의심 X
2. 매 사이클 끝 = signal next_n 박제 (잔여 = 사용자 N - 현재 사이클 번호). 마지막 사이클은 next_n=0
3. handoff save 자동 호출 X — cycle_state JSON 으로 carry-over 충분. handoff save 는 사용자 manual 또는 명시적 stop 신호 시만
4. 사용자 끼어들기 (next_n=0 박제 또는 "stop" 입력) 가 유일한 stop 신호. 그 외엔 진행
5. 사용자 % 알림 (예: "지금 80% 야") 받으면 그 사이클 끝낸 후 signal 박제 (정상 진행). handoff save X

**자가 의심 차단 명문화**: 사이클 N 시점에 메인이 "100 사이클 의미 있나?" 자가 판단 절대 X. 사용자 결정이 단일 stop 신호.
