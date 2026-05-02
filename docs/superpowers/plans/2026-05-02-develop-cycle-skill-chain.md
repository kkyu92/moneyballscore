# develop-cycle Skill Chain + cycle_state Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** develop-cycle skill 의 진단 → 차원 선택 → dispatch → 회고 4 단계를 chain pool 6개 + cycle_state JSON 인프라로 강화. 사용자 비전 = "사이클 안 skill chain 자율 선택 + N회 자동 운영" 도달.

**Architecture:** 본 메인 영역 = (1) SKILL.md draft 박제 (`docs/superpowers/specs/`), (2) zero-touch install.sh 보강 (`~/.develop-cycle/cycles/` mkdir), (3) README.md 갱신, (4) dry-run trace doc. 사용자 영역 = 글로벌 SKILL.md 적용 (cp + 검증).

**Tech Stack:** Markdown (skill prompt 문서) + Bash (install.sh) + JSON (cycle_state schema, 추후 SKILL.md instruction 으로 박제).

**Spec:** [`docs/superpowers/specs/2026-05-02-develop-cycle-skill-chain-design.md`](../specs/2026-05-02-develop-cycle-skill-chain-design.md)

---

## File Structure

| 경로 | 책임 | Task |
|---|---|---|
| `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` | 글로벌 SKILL.md 갱신 본문 (사용자가 cp 로 적용) | Task 1 |
| `tools/zero-touch/install.sh` | `~/.develop-cycle/cycles/` 디렉토리 mkdir 추가 | Task 2 |
| `tools/zero-touch/README.md` | chain pool + cycle_state 사용 안내 추가 | Task 3 |
| `docs/superpowers/specs/2026-05-02-develop-cycle-chain-dryrun.md` | 6 시나리오 → expected chain trace | Task 4 |
| `TODOS.md` | 사용자 영역 SKILL.md 갱신 항목에 draft 경로 명시 | Task 1 (같은 commit) |

총 5 파일 (4 신규 + 2 갱신). 4 task = 4 commit.

---

## Task 1: SKILL.md draft 박제

**Files:**
- Create: `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md`
- Modify: `TODOS.md` (사용자 영역 SKILL.md 항목에 draft 경로 명시)

**Why:** 글로벌 `~/.claude/skills/develop-cycle/SKILL.md` 는 사용자 영역. 본 메인이 직접 수정 X. draft 를 본 리포 spec 폴더에 박제 → 사용자가 `cp` 로 글로벌 적용 (사용자 영역 작업 1건).

draft 본문 source = `docs/superpowers/specs/2026-05-02-develop-cycle-skill-chain-design.md` § 4 (chain pool) + § 5 (Layer A) + § 6 (cycle_state) + § 7 (다음 사이클 input) + § 8 (4 단계 갱신) + § 9 (호환성) + § 10 (실패 모드). spec 본문을 글로벌 skill 박제 형식으로 옮긴다.

- [ ] **Step 1: draft 파일 생성 + 머릿말 (front-matter + 비전 한 줄)**

```bash
touch docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
```

내용 (Write 도구):

```markdown
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
```

- [ ] **Step 2: chain pool table 박제 (sub-section ## chain pool)**

```markdown
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
```

- [ ] **Step 3: 진단 단계 본문 박제 (sub-section ## 진단)**

```markdown
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
```

- [ ] **Step 4: chain 선택 단계 본문 박제 (sub-section ## chain 선택)**

```markdown
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
```

- [ ] **Step 5: dispatch 단계 본문 박제 (sub-section ## chain 시퀀스 실행)**

```markdown
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
```

- [ ] **Step 6: 회고 단계 + cycle_state JSON write 박제 (sub-section ## 회고)**

```markdown
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
```

- [ ] **Step 7: 안전장치 + 호환성 본문 박제 (sub-section ## 실패 모드 / ## 호환성)**

```markdown
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
```

- [ ] **Step 8: TODOS.md 갱신 — 사용자 영역 SKILL.md 항목에 draft 경로 명시**

기존 TODOS.md 항목 (`tools/zero-touch/README.md` 의 "전제 조건" 섹션 참조) 을 다음으로 교체:

```markdown
- [ ] **글로벌 SKILL.md 갱신** — `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` 의 본문을 `~/.claude/skills/develop-cycle/SKILL.md` 로 cp. 검증: `grep -E "chain pool|cycle_state|fix-incident" ~/.claude/skills/develop-cycle/SKILL.md`. 6 chain 이름 + chain pool 단어 + cycle_state 단어 모두 grep 명중 시 OK
```

- [ ] **Step 9: grep 검증**

```bash
grep -c "fix-incident\|explore-idea\|polish-ui\|review-code\|operational-analysis\|dimension-cycle" docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
```

Expected: 6 이상 (각 chain 이름이 chain pool table + 본문에 최소 1회 등장)

```bash
grep -c "cycle_state" docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
```

Expected: 5 이상 (스키마 + read + write + handoff 분리 표 + 실패 모드)

- [ ] **Step 10: Commit**

```bash
git add docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md TODOS.md
git commit -m "$(cat <<'EOF'
docs(spec): develop-cycle SKILL.md draft — chain pool + cycle_state

글로벌 ~/.claude/skills/develop-cycle/SKILL.md 갱신 본문을 본 리포 spec 폴더에 박제. 사용자가 cp 로 글로벌 적용 (TODOS 사용자 영역 항목 갱신). chain pool 6개 (fix-incident/explore-idea/polish-ui/review-code/operational-analysis/dimension-cycle) + cycle_state JSON Med 깊이 + 4 단계 (진단/chain 선택/dispatch/회고) 갱신 + 실패 모드 + 호환성. 별도 commit 으로 install.sh / README / dryrun trace 따라옴.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: 1 file changed (draft 신규) + 1 file changed (TODOS modified). commit hash 출력.

---

## Task 2: install.sh — `~/.develop-cycle/cycles/` 디렉토리 mkdir

**Files:**
- Modify: `tools/zero-touch/install.sh:30-33` (`echo "→ ~/.develop-cycle/ 셋업"` 블록 안)

**Why:** cycle_state JSON 이 `~/.develop-cycle/cycles/<n>.json` 에 저장되므로 install.sh 가 자동 mkdir. 사용자가 별도 mkdir 안 해도 됨.

- [ ] **Step 1: install.sh 의 셋업 블록 위치 확인**

```bash
grep -n "mkdir -p '\$DC_HOME'" tools/zero-touch/install.sh
```

Expected: line 31 정도 — `run "mkdir -p '$DC_HOME'"`

- [ ] **Step 2: cycles/ mkdir 한 줄 추가 (Edit 도구)**

old_string (line 30-33):
```
echo "→ ~/.develop-cycle/ 셋업"
run "mkdir -p '$DC_HOME'"
run "cp '$SCRIPT_SRC' '$DC_HOME/watch.sh'"
run "chmod +x '$DC_HOME/watch.sh'"
```

new_string:
```
echo "→ ~/.develop-cycle/ 셋업"
run "mkdir -p '$DC_HOME'"
run "mkdir -p '$DC_HOME/cycles'"
run "cp '$SCRIPT_SRC' '$DC_HOME/watch.sh'"
run "chmod +x '$DC_HOME/watch.sh'"
```

- [ ] **Step 3: bash -n 문법 검증**

```bash
bash -n tools/zero-touch/install.sh
```

Expected: exit 0, stdout/stderr 비어 있음

- [ ] **Step 4: DRY_RUN 검증 (cycles mkdir 출력 확인)**

```bash
DRY_RUN=1 TELEGRAM_WEBHOOK=dummy tools/zero-touch/install.sh 2>&1 | grep "cycles"
```

Expected: `DRY: mkdir -p '/Users/kyusikkim/.develop-cycle/cycles'` 한 줄

- [ ] **Step 5: Commit**

```bash
git add tools/zero-touch/install.sh
git commit -m "$(cat <<'EOF'
feat(zero-touch): install.sh — ~/.develop-cycle/cycles/ mkdir 추가

cycle_state JSON (~/.develop-cycle/cycles/<n>.json) 인프라 박제. install.sh 가 자동 mkdir 하므로 사용자 별도 작업 X. develop-cycle skill chain spec 의 Layer B 인프라.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: 1 file changed (install.sh +1 line). commit hash 출력.

---

## Task 3: README.md — chain pool + cycle_state 사용 안내 추가

**Files:**
- Modify: `tools/zero-touch/README.md` (메커니즘 다이어그램 위치 업데이트 + 새 섹션 "## chain pool 비전" + "## cycle_state" 추가)

**Why:** zero-touch README 가 운영 매뉴얼 source of truth. SKILL.md draft (Task 1) + cycles/ 인프라 (Task 2) 추가됐으니 README 도 같이 갱신.

- [ ] **Step 1: README "전제 조건 (사용자 영역)" 섹션 갱신 — SKILL.md 갱신 instruction 보강**

old_string (line 38-62):
```
### 2. 글로벌 develop-cycle SKILL.md 갱신

`~/.claude/skills/develop-cycle/SKILL.md` 의 사이클 끝 단계에 다음 추가:

**정상 끝**:
```bash
cat > ~/.develop-cycle/signal <<EOF
$CYCLE_NUM
OK

$NEXT_N
EOF
```

**fail 끝**:
```bash
cat > ~/.develop-cycle/signal <<EOF
$CYCLE_NUM
FAIL
$REASON
0
EOF
```

`$NEXT_N` = 사용자가 처음 호출한 N 동일 (무한 반복) 또는 0 (정지). skill 자체가 결정.
```

new_string:
```
### 2. 글로벌 develop-cycle SKILL.md 갱신

전체 본문은 `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` 박제됨. 사용자 영역 적용:

```bash
cp docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md ~/.claude/skills/develop-cycle/SKILL.md
grep -E "chain pool|cycle_state|fix-incident" ~/.claude/skills/develop-cycle/SKILL.md  # 명중 시 OK
```

draft 본문 핵심:
- chain pool 6개 (fix-incident / explore-idea / polish-ui / review-code / operational-analysis / dimension-cycle) + 메인 자유 추론
- cycle_state JSON 작성 (~/.develop-cycle/cycles/<n>.json)
- zero-touch signal file 작성 (기존 형식 그대로)

(spec: `docs/superpowers/specs/2026-05-02-develop-cycle-skill-chain-design.md`)
```

- [ ] **Step 2: "## 메커니즘" 다이어그램 다음에 새 섹션 "## chain pool" 삽입**

old_string (line 22 직후):
```
## 전제 조건 (사용자 영역)
```

new_string:
```
## chain pool — 도구상자 6개

| Chain | trigger | 시퀀스 |
|---|---|---|
| `fix-incident` | 버그/silent 실패 | `/investigate` → 코드 수정 → `/ship` |
| `explore-idea` | 신규 기능/큰 방향 | `/office-hours` → `/plan-ceo-review` → `/plan-eng-review` → 구현 → `/ship` |
| `polish-ui` | UI 이슈/디자인 부채 | `/plan-design-review` → `/design-review` → `/ship` |
| `review-code` | 코드 품질/테스트 부채 | `/health` → `/simplify` → `/review` → `/ship` |
| `operational-analysis` | 운영 분석/적중률 | `/weekly-review` → `/extract-pattern` → `/compound` |
| `dimension-cycle` (legacy) | 위 안 맞음 | 기존 site/acquisition/model 차원 dispatch |

매 사이클의 진단 결과 보고 메인 (Opus 4.7) 이 자유 선택. 새 chain 추가 = SKILL.md table 한 행 추가.

## cycle_state — 사이클 사이 carry-over

위치: `~/.develop-cycle/cycles/<n>.json` (install.sh 가 자동 mkdir)

스키마: spec § 6.2 (`docs/superpowers/specs/2026-05-02-develop-cycle-skill-chain-design.md`).

다음 사이클 진단 단계가 직전 3 cycle_state read → input_from_prev_cycles + 중복 chain 회피 신호.

## 전제 조건 (사용자 영역)
```

- [ ] **Step 3: grep 검증 (chain pool + cycle_state 단어 등장)**

```bash
grep -c "chain pool\|cycle_state\|fix-incident\|explore-idea" tools/zero-touch/README.md
```

Expected: 5 이상

- [ ] **Step 4: Commit**

```bash
git add tools/zero-touch/README.md
git commit -m "$(cat <<'EOF'
docs(zero-touch): README — chain pool + cycle_state 안내 추가

SKILL.md draft (Task 1) + cycles/ mkdir (Task 2) 와 일관. zero-touch README 가 운영 매뉴얼 source of truth 이므로 chain pool 6개 table + cycle_state 위치/책임 + 사용자 영역 적용 명령 (cp + grep 검증) 박제.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: 1 file changed (README modified). commit hash 출력.

---

## Task 4: dry-run trace document — 6 시나리오 expected chain

**Files:**
- Create: `docs/superpowers/specs/2026-05-02-develop-cycle-chain-dryrun.md`

**Why:** SKILL.md draft (Task 1) 의 chain pool 6개 적용 조건이 메인 LLM 추론 가이드. 시나리오 6개 박제 → 사용자 영역 첫 fire 후 자연 검증 (실제 chain 선택과 expected 비교).

- [ ] **Step 1: dry-run trace 파일 생성 + 머릿말**

내용 (Write 도구):

```markdown
# develop-cycle chain pool — Dry-Run Trace

**작성일**: 2026-05-02
**대상**: SKILL.md draft (`docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md`) 의 chain pool 6개 적용 조건 검증
**목적**: 사용자 영역 첫 fire 후 메인의 실제 chain 선택과 expected 비교 → 적용 조건 명확성 측정

## 시나리오 6개

각 시나리오 = 진단 결과 (key_findings) + chain pool table → expected chain.

### 시나리오 A — fix-incident

**key_findings**:
- "live-update cron 5/2 silent skip 발견 (사례 7 류)"
- "Sentry alert silent 차단 안 됨"

**Expected chain**: `fix-incident`

**Reason**: silent 실패 패턴 (CLAUDE.md 사례 6/7 류). investigate → ship 흐름이 자연.

### 시나리오 B — explore-idea

**key_findings**:
- "사용자 자연 발화: '머신러닝 도입해서 적중률 올려보자'"
- "신규 기능 idea, 구체적 spec 없음"

**Expected chain**: `explore-idea`

**Reason**: 새 product idea + 큰 방향 미정. office-hours brainstorm → ceo + eng 리뷰 → 구현 흐름.

### 시나리오 C — polish-ui

**key_findings**:
- "/analysis 페이지 모바일 layout 깨짐"
- "design 일관성 균열 (DESIGN.md 와 다른 컬러 사용)"

**Expected chain**: `polish-ui`

**Reason**: UI 이슈 + 디자인 부채. plan-design-review → design-review fix 흐름.

### 시나리오 D — review-code

**key_findings**:
- "packages/kbo-data/ 테스트 커버리지 60% (목표 80%)"
- "agents/debate.ts 복잡도 누적 (300+ 줄, 분리 가치)"

**Expected chain**: `review-code`

**Reason**: 코드 품질 / 테스트 부족. health → simplify → review 흐름.

### 시나리오 E — operational-analysis

**key_findings**:
- "지난 1주 적중률 평균 58% (목표 60%)"
- "Brier 0.245 (직전 주 0.231 보다 악화)"

**Expected chain**: `operational-analysis`

**Reason**: 운영 데이터 분석 + 적중률 metric. weekly-review → extract-pattern → compound 흐름.

### 시나리오 F — dimension-cycle (legacy default)

**key_findings**:
- "특별한 incident / idea / UI / 품질 / metric 없음"
- "정기적 site 차원 (LCP / CLS / 모바일) 점검 가치"

**Expected chain**: `dimension-cycle`

**Reason**: 위 5개 chain 어디에도 안 맞음. 기존 차원 dispatch (site / acquisition / model 자율) 폴백.

## 검증 방법 (사용자 영역 첫 fire 후)

1. tmux 안 `/develop-cycle 6` 호출 (6 사이클 = 6 chain 한 번씩 시뮬 가능)
2. 각 사이클 끝 후 `~/.develop-cycle/cycles/<n>.json` 확인
3. cycle_state.chain_selected + chain_reason 박제 확인
4. 위 시나리오와 비교 (메인 자율 추론이 expected 와 일치하나)
5. 일치 X → SKILL.md draft 의 chain pool 적용 조건 표현 보강 (다음 PR)
```

- [ ] **Step 2: grep 검증 (6 chain 이름 모두 포함)**

```bash
grep -c "fix-incident\|explore-idea\|polish-ui\|review-code\|operational-analysis\|dimension-cycle" docs/superpowers/specs/2026-05-02-develop-cycle-chain-dryrun.md
```

Expected: 6 이상 (각 chain 이름이 시나리오 + Expected chain 본문에 최소 1회)

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-02-develop-cycle-chain-dryrun.md
git commit -m "$(cat <<'EOF'
docs(spec): develop-cycle chain pool — dry-run 6 시나리오 trace

SKILL.md draft 의 chain pool 6개 적용 조건 명확성 검증용. 시나리오 A~F = key_findings + expected chain + reason 박제. 사용자 영역 첫 fire (`/develop-cycle 6`) 후 cycle_state.chain_selected 와 expected 비교 → 일치 X 면 SKILL.md draft 적용 조건 표현 보강 (다음 PR).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: 1 file changed (dryrun trace 신규). commit hash 출력.

---

## 사용자 영역 verification (Task 외부 — 자연 검증)

본 plan 의 4 task 가 본 메인 영역 commit 4개 마치면, 사용자 영역 다음 작업:

1. **글로벌 SKILL.md 적용** (TODOS.md 갱신 항목):
   ```bash
   cp docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md ~/.claude/skills/develop-cycle/SKILL.md
   grep -E "chain pool|cycle_state|fix-incident" ~/.claude/skills/develop-cycle/SKILL.md
   ```
   Expected: 6+ 명중

2. **install.sh 재실행** (cycles/ 디렉토리 mkdir):
   ```bash
   tools/zero-touch/install.sh
   ls -la ~/.develop-cycle/cycles/
   ```
   Expected: cycles/ 디렉토리 존재

3. **첫 fire** (zero-touch + chain pool 통합 검증):
   ```bash
   # tmux 안 mcc 호출 후
   /develop-cycle 6
   ```
   - 6 사이클 끝 후 `~/.develop-cycle/cycles/1.json` ~ `6.json` 확인
   - cycle_state.chain_selected 가 6 chain 모두 한 번씩 시도하는지 (또는 시나리오 A~F dryrun trace 와 매칭하는지)
   - 일치 X 면 SKILL.md draft 의 chain pool 적용 조건 표현 보강 (다음 PR)

---

## Self-Review (작성 후 inline 점검)

### Spec coverage

| Spec § | Task |
|---|---|
| § 1 비전 | Task 1 step 1 (draft 머릿말) |
| § 2 비스코프 | 본 plan 헤더 + Task 1 chain pool table 의 dimension-cycle (default fallback) 명시 |
| § 3 사용자 결정 4건 | Task 1 step 1 (draft 머릿말) + Task 1~4 분배 |
| § 4 chain pool | Task 1 step 2 (chain pool table) |
| § 5 Layer A 메커니즘 | Task 1 step 3-5 (진단/chain 선택/dispatch) |
| § 6 cycle_state schema | Task 1 step 6 (회고) |
| § 7 다음 사이클 input | Task 1 step 3 (진단 단계) |
| § 8 SKILL.md 4 단계 갱신 | Task 1 step 3-6 |
| § 9 호환성 | Task 1 step 7 + Task 3 (README) |
| § 10 실패 모드 | Task 1 step 7 |
| § 11 테스트 plan | Task 4 (dry-run 6 시나리오) + Task 1 step 9 (grep) + Task 2 step 4 (DRY_RUN) + 사용자 영역 verification |
| § 12 산출물 | Task 1~4 분배 |
| § 13 작업 분량 | 본 plan |
| § 14 다음 단계 | 사용자 영역 verification |

### Placeholder scan

- TBD/TODO/vague: 없음
- "Add appropriate error handling" 류: 없음 (실패 모드 표 명시)
- 코드 step 의 명시: 모두 code block + grep 명령 expected

### Type consistency

- chain pool 6개 이름 일관: `fix-incident` / `explore-idea` / `polish-ui` / `review-code` / `operational-analysis` / `dimension-cycle` — Task 1, 3, 4 모두 동일
- cycle_state field 일관: `chain_selected` / `chain_reason` / `execution.skills_invoked` / `retro.next_recommended_chain` — spec § 6.2 와 Task 1 step 6 동일
- 파일 경로 일관: `~/.develop-cycle/cycles/<n>.json`, `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md`

OK. Self-review pass.
