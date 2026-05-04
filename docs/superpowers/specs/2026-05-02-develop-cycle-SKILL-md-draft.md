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

## chain pool — 도구상자 9개

매 사이클의 진단 결과 보고 메인 (Opus 4.7) 이 자유 추론으로 1개 선택. 룰 X. 새 chain 추가 = 본 table 한 행 추가.

`expand-scope` / `design-system` = 메인 자율 선택. `skill-evolution` = trigger 충족 시 강제 자동 발화 (메인 자율 X).

| Chain | 적용 조건 (trigger) | 시퀀스 | 멈춤 조건 |
|---|---|---|---|
| `fix-incident` | 진단 = 버그/에러/silent 실패/regression | `/investigate` → 코드 수정 → `/ship` | PR 생성 + CI green 또는 root cause 미해결 |
| `explore-idea` | 진단 = 신규 기능 / 큰 방향 미정 / 자연 발화 새 product idea | `/office-hours` → `/plan-ceo-review` → `/plan-eng-review` → 구현 → `/ship` | spec/plan 박제 또는 사용자 reject |
| `polish-ui` | 진단 = 작은 UI 이슈 / 디자인 부채 / 디자인 일관성 균열 (시스템 레벨 X) | `/plan-design-review` → `/design-review` → `/ship` | UI fix PR 또는 design system 박제 |
| `review-code` | 진단 = 코드 품질 / 테스트 부족 / 복잡도 누적 | `/health` → `/simplify` → `/review` → `/ship` | 품질 score 개선 또는 cleanup PR |
| `operational-analysis` | 진단 = 운영 데이터 분석 / 적중률 metric / 패턴 학습 | `/weekly-review` → `/extract-pattern` → `/compound` | 회고 박제 또는 lesson PR |
| `dimension-cycle` (legacy default) | 위 어디에도 안 맞음 | 기존 site/acquisition/model 차원 dispatch (Agent Teams 기존 디자인) | 기존 디자인 동일 |
| `expand-scope` (신규, 메인 자율) | 메타 기획 — (1) 직전 4 사이클 모두 small fix (`fix-incident`/`polish-ui`/`review-code` 만) (2) GH issue body 에 architecture/refactor/redesign/scope 키워드 (3) `meta-pattern` 누적 = "이 영역 재검토" (4) 사용자 N = milestone (5) TODOS.md "큰 방향" 4주+ 미진행 | `/office-hours` → `/plan-ceo-review` (**SCOPE EXPANSION 강제**) → `superpowers:brainstorming` → spec write → `superpowers:writing-plans` → 구현 → `/ship` | spec + ship PR (success) / spec only + 사용자 review (partial) / "확장 가치 부족" 결론 → retro-only |
| `design-system` (신규, 메인 자율) | 시스템 디자인 — (1) `DESIGN.md` 갱신 ≥ 4주 (2) 새 area 디자인 spec 부재 (3) 사용자 발화 ("디자인 다듬어" / "shotgun 돌려줘") (4) `meta-pattern` = "design chain 0회 N 사이클" (5) DESIGN.md vs 컴포넌트 균열 grep | `/design-consultation` → `/design-shotgun` → `/plan-design-review` → (선택) `/design-html` → 구현 → `/design-review` → `/ship` | design system PR (success) / consultation+shotgun (partial) / "현 디자인 충분" → retro-only |
| `skill-evolution` (신규, 자동 발화) | SKILL.md 자가 갱신 — trigger OR (메인 자율 X): (1) `chain-evolution` subtype commit 5건 누적 (전체 git history) (2) 같은 chain 5회 연속 fail (3) `cycle_n % 50 == 0` (4) `meta-pattern` body 에 "SKILL 갱신 필요" (5) 직전 20 사이클 동안 chain 1개 0회 발화 | trigger 증거 수집 → 갱신 영역 list → `/office-hours` → spec write → `~/.claude/skills/develop-cycle/SKILL.md` Edit + draft Edit 동기 → `pnpm test` smoke → commit `feat(skill):` → branch `develop-cycle/skill-evolution-N` → PR + R7 → `meta-pattern` dispatch (변경 diff) | SKILL 변경 PR 박제 + R7 머지 (success) / spec only + 사용자 review (partial) / "현 SKILL 충분" → retro-only |

### 책임 경계

- chain pool = 도구상자. 어떤 chain 들이 사용 가능한지 명시
- 선택 = 메인 자율 추론. 진단 결과 + chain pool 보고 자유 선택
- 실행 = chain sequence 직렬 호출 (Skill 도구 또는 Agent 도구). chain 안 sub-skill 실패 시 stop 조건 따라 회고

## dispatch 채널 — 워커→허브 양방향 (4채널)

기존 `submit-lesson.yml` workflow 가 이미 4 prefix (`lesson:` / `policy:` / `feedback:` / `memory:`) 모두 허브 dispatch (2026-04-29 박제). 신규 workflow X — body 의 `subtype:` 라인으로 4채널 분류. 허브 측 단일 `worker-lesson` 채널이 subtype 보고 routing.

| 채널 | trigger | payload (commit body) | commit prefix + subtype | 빈도 가드 |
|---|---|---|---|---|
| `lesson` (기존) | 박제할 학습 발견 | lesson markdown (사례 / 원인 / 대응 / 박제 위치) | `lesson:` + `subtype: lesson` | 자율 (사이클 1+ 가능) |
| `cycle-retro` (신규) | 매 사이클 끝 자율 | `cycle_n` / `chain_selected` / `outcome` / `retro.summary` / `next_recommended_chain` + 본 메인 한줄 메타 | `policy:` + `subtype: cycle-retro` | 매 사이클 1회 강제 |
| `meta-pattern` (신규) | N ≥ 5 누적 발견 자율 판단 | 패턴 description + 증거 (cycle_n list) + 추천 행동 | `memory:` + `subtype: meta-pattern` | 임계 충족 시만 (잡음 차단) |
| `chain-evolution` (신규) | 자율 chain 후보 판단 | 신규 chain spec — slug / trigger / 시퀀스 / stop 조건 / 발화 예시 | `memory:` + `subtype: chain-evolution` | 자율 (5건 누적 → `skill-evolution` trigger) |

### commit body 표준 형식 예시

```
memory: chain-evolution security-audit chain 후보

subtype: chain-evolution
slug: security-audit
trigger:
  - GH issue body 에 security/audit/CVE 키워드
  - Sentry alert 에 sensitive data leak
  - dependabot vulnerability alert
sequence: /cso → /security-review → spec write → ship
stop: security PR 박제 또는 retro-only
evidence:
  - cycle 23: fix-incident chain 으로 처리됐지만 cso 시야 부재
  - cycle 25: 동일 영역 두 번째 발생
  - cycle 27: pattern 명확
recommendation: chain pool 9번째 추가 가치
```

### 단일 사이클 dispatch 한도

- 단일 사이클 lesson channel dispatch ≤ 2 commit (cycle-retro 1 강제 + 메타 류 1 자율 = max 2)
- 매 사이클 4건 dispatch = 잡음 가드
- `meta-pattern` + `chain-evolution` 둘 다 한 사이클에 발화 X (자율 1택)

### 자가 발화 위치 (skill 시퀀스 안)

```
사이클 단계 4 (회고)
  ├── cycle_state JSON write           (~/.develop-cycle/cycles/<n>.json)
  ├── (1) cycle-retro commit          ← 강제 dispatch (매 사이클)
  ├── 본 메인 자가 평가
  │     - 5+ 누적 메타 발견 있나?  → (2) meta-pattern commit
  │     - 신규 chain 후보 명확한가? → (3) chain-evolution commit
  │     - 둘 다 X                  → 추가 dispatch X
  ├── lesson 발견 시               → (4) lesson commit (자율)
  ├── skill-evolution trigger 평가
  ├── zero-touch signal file 작성
  └── R7 자동 머지
```

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

### skill-evolution trigger 자동 평가 (매 사이클 retro 마지막 step)

cycle_state JSON write 후, dispatch 채널 commit 박제 후, signal file 작성 직전에 본 메인이 다음 trigger 5개 중 하나라도 충족 여부 자가 평가:

| # | 조건 | 평가 명령 |
|---|---|---|
| 1 | `chain-evolution` subtype commit 5건 누적 (전체 git history) | `git log --all --grep "subtype: chain-evolution" --oneline \| wc -l` ≥ 5 |
| 2 | 같은 chain 5회 연속 outcome=fail | 직전 5 cycle_state JSON read 후 `chain_selected` + `outcome=fail` 동일 5회 |
| 3 | `cycle_n % 50 == 0` (milestone) | $CYCLE_N % 50 == 0 |
| 4 | `meta-pattern` body 에 "SKILL 갱신 필요" 명시 | 본 사이클의 `meta-pattern` commit body grep "SKILL 갱신 필요" |
| 5 | 직전 20 사이클 동안 chain pool 의 chain 1개가 0회 발화 | 직전 20 cycle_state JSON 의 `chain_selected` distinct count vs chain pool 9개 비교 |

**충족 시 동작**: signal file 의 next_n 변경 X (정상 진행). 다음 사이클 진단 단계 첫 step 에서 본 메인이 `~/.develop-cycle/skill-evolution-pending` 마커 파일 존재 확인 → 존재 시 `skill-evolution` chain 강제 발화 (자율 X).

**충족 X**: 어떤 trigger 도 충족 안 됐으면 정상 진행 (signal next_n 박제 + zero-touch 자동 fire).

**충족 시 마커 박제**:

```bash
echo "$CYCLE_N: $(git log -1 --format=%H)" > ~/.develop-cycle/skill-evolution-pending
```

다음 사이클이 본 마커 발견 시 = `skill-evolution` chain 자동 발화. chain 끝 (= success 또는 retro-only) 시 마커 삭제 (`rm ~/.develop-cycle/skill-evolution-pending`).

### 다음 사이클이 skill-evolution 강제 발화 (마커 발견 시)

진단 단계 첫 step:

```bash
if [ -f ~/.develop-cycle/skill-evolution-pending ]; then
  echo "skill-evolution 자동 발화 — 마커: $(cat ~/.develop-cycle/skill-evolution-pending)"
  # chain_selected = "skill-evolution" 자동 결정 (메인 자율 X)
  # 시퀀스: trigger 증거 수집 → 갱신 영역 list → /office-hours → spec write
  #         → ~/.claude/skills/develop-cycle/SKILL.md Edit + draft Edit
  #         → pnpm test smoke → commit feat(skill): → PR + R7
  #         → meta-pattern dispatch (변경 diff)
  # chain 끝: rm ~/.develop-cycle/skill-evolution-pending
fi
```

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
