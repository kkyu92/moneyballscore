# develop-cycle meta-expansion implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** spec `2026-05-04-develop-cycle-meta-expansion-design.md` 의 chain pool 6 → 9 + dispatch 채널 1 → 4 + SKILL 자가 진화 메커니즘을 SKILL.md 양쪽 (글로벌 + draft) 에 lockstep 박제 + smoke test + R7 자동 머지

**Architecture:** SKILL.md 두 파일 (글로벌 `~/.claude/skills/develop-cycle/SKILL.md` + repo draft `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md`) 동시 Edit. 영역별 task 6개 (chain pool 표 / dispatch 채널 표 / skill-evolution 자동 발화 / 발화 빈도 가드 / 마이그레이션 path / 글로벌 cp + smoke test + PR). 각 영역 = grep 검증으로 적용 확인. 마지막 = pnpm test smoke + PR + R7 자동 머지.

**Tech Stack:** markdown (SKILL.md), bash (cp / grep / pnpm), gh CLI, git

**기존 working tree 상태**:
- branch: main
- HEAD: d5f712b (PR #64 머지)
- working tree: clean
- dc-watch: unloaded (cycle 25+ spawn 차단)
- 글로벌 SKILL.md: 240줄 (2026-05-02 박제)
- repo draft: 글로벌과 동일 콘텐츠 (cycle 19까지 박제 그대로)

---

## Task 0: branch 생성 + 사전 준비

**Files:**
- Verify: `~/.claude/skills/develop-cycle/SKILL.md` (현재 240줄 확인)
- Verify: `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` (글로벌과 동기 확인)
- Create branch: `develop-cycle/meta-expansion-impl` (R7 자동 머지 prefix)

- [ ] **Step 1: 두 파일 line count 일치 확인**

```bash
cd ~/projects/moneyballscore
GLOBAL_LINES=$(wc -l < ~/.claude/skills/develop-cycle/SKILL.md)
DRAFT_LINES=$(wc -l < docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md)
echo "global=$GLOBAL_LINES draft=$DRAFT_LINES"
```

Expected: `global=240 draft=240` (동일 + 240)

만약 불일치 → 즉시 stop, 사용자에게 보고. lockstep 깨진 상태에서 진행 금지.

- [ ] **Step 2: 두 파일 diff 확인 (콘텐츠 동기)**

```bash
diff ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
```

Expected: 빈 출력 (완전 동기)

만약 diff 발견 → 즉시 stop, 사용자에게 어느 쪽이 진실인지 confirm 받기. 본 plan 전 이슈 처리.

- [ ] **Step 3: branch 생성**

```bash
cd ~/projects/moneyballscore
git checkout main
git pull origin main --ff-only
git checkout -b develop-cycle/meta-expansion-impl
git branch --show-current
```

Expected: `develop-cycle/meta-expansion-impl`

- [ ] **Step 4: spec read (참조 + 진행 중 모순 발견 시 fix 위치 확인)**

spec 280줄 = 본 plan 의 source of truth. Task 1-6 진행 중 spec 과 모순 발견 시 spec 이 진실 (이미 사용자 승인 + 머지). plan 의 step 만 spec 따라 갱신.

```bash
wc -l docs/superpowers/specs/2026-05-04-develop-cycle-meta-expansion-design.md
```

Expected: `280`

---

## Task 1: chain pool 표 확장 (6 → 9)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` (chain pool table)
- Modify: `~/.claude/skills/develop-cycle/SKILL.md` (동일 chain pool table — 동일 위치)

**현재 chain pool table 위치**: 두 파일 모두 `## chain pool — 도구상자 6개` 섹션 (line ~23).

- [ ] **Step 1: 표 구조 확인**

```bash
grep -n "chain pool" ~/.claude/skills/develop-cycle/SKILL.md
```

Expected:
```
23:## chain pool — 도구상자 6개
38:- chain pool = 도구상자. 어떤 chain 들이 사용 가능한지 명시
```

- [ ] **Step 2: draft 의 헤더 + 표 갱신 (Edit 도구)**

`docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` 에서:

old_string:
```
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
```

new_string:
```
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
```

- [ ] **Step 3: 글로벌 SKILL.md 동일 변경 (Edit 도구, 동일 old_string/new_string)**

`~/.claude/skills/develop-cycle/SKILL.md` 에 위와 동일한 Edit 적용.

- [ ] **Step 4: 변경 검증 — grep 으로 신규 chain 3개 확인**

```bash
for f in ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md; do
  echo "=== $f ==="
  grep -c "expand-scope\|design-system\|skill-evolution" "$f"
done
```

Expected: 두 파일 모두 ≥ 3 (각 신규 chain 1번 이상 등장)

- [ ] **Step 5: 두 파일 diff 재확인 (lockstep 유지)**

```bash
diff ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
```

Expected: 빈 출력 (양쪽 동기 유지)

- [ ] **Step 6: 중간 commit (영역별 commit)**

```bash
cd ~/projects/moneyballscore
git add docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
git commit -m "feat(skill): chain pool 6 → 9 — expand-scope/design-system/skill-evolution 추가"
```

Note: 글로벌 SKILL.md 는 git 외부 (`~/.claude/`) — git add X. 글로벌 변경 hash 별도 박제 없이 본 commit 의 diff 가 단일 진실.

---

## Task 2: dispatch 채널 표 추가 (1 → 4 채널)

**Files:**
- Modify: 두 SKILL.md 파일 (chain pool 표 직후 신규 섹션 추가)

- [ ] **Step 1: 신규 섹션 위치 확인**

chain pool 표 끝 (`### 책임 경계` 직전) 에 신규 `## dispatch 채널 — 워커→허브 양방향 (4채널)` 섹션 삽입.

```bash
grep -n "### 책임 경계" ~/.claude/skills/develop-cycle/SKILL.md
```

Expected: `36:### 책임 경계` (현재) — Task 1 변경 후 line 번호 변동 가능. 직전 grep 으로 재확인.

- [ ] **Step 2: draft 에 신규 섹션 삽입 (Edit 도구)**

`docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` 에서:

old_string:
```
### 책임 경계

- chain pool = 도구상자. 어떤 chain 들이 사용 가능한지 명시
- 선택 = 메인 자율 추론. 진단 결과 + chain pool 보고 자유 선택
- 실행 = chain sequence 직렬 호출 (Skill 도구 또는 Agent 도구). chain 안 sub-skill 실패 시 stop 조건 따라 회고
```

new_string:
```
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
```

- [ ] **Step 3: 글로벌 SKILL.md 동일 변경**

위 Edit 을 `~/.claude/skills/develop-cycle/SKILL.md` 에도 동일 적용.

- [ ] **Step 4: 변경 검증**

```bash
for f in ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md; do
  echo "=== $f ==="
  grep -c "cycle-retro\|meta-pattern\|chain-evolution" "$f"
  grep -c "## dispatch 채널" "$f"
done
```

Expected: 첫 grep ≥ 5 (각 채널 + commit body 예시), 둘째 = 1 (섹션 헤더)

- [ ] **Step 5: lockstep diff 재확인**

```bash
diff ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
```

Expected: 빈 출력

- [ ] **Step 6: 중간 commit**

```bash
git add docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
git commit -m "feat(skill): dispatch 채널 1 → 4 — cycle-retro/meta-pattern/chain-evolution subtype 추가"
```

---

## Task 3: skill-evolution 자동 발화 trigger 평가 위치 명문화

**Files:**
- Modify: 두 SKILL.md 파일 (사이클 단계 4 회고 섹션에 trigger 평가 step 추가)

- [ ] **Step 1: 사이클 단계 4 회고 섹션 위치 확인**

```bash
grep -n "## 사이클 단계 4 — 회고" ~/.claude/skills/develop-cycle/SKILL.md
grep -n "### zero-touch signal file 작성" ~/.claude/skills/develop-cycle/SKILL.md
```

Expected: 각각 1줄 출력 (line 번호는 Task 1, 2 변경 후 갱신됨)

- [ ] **Step 2: draft 에 trigger 평가 섹션 삽입 (Edit 도구)**

`docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` 에서:

old_string:
```
### handoff carry-over 와 책임 분리

| 메커니즘 | 단위 | 위치 |
|---|---|---|
| handoff save | 세션 단위 | `~/.gstack/projects/<slug>/checkpoints/` |
| cycle_state | 사이클 단위 | `~/.develop-cycle/cycles/<n>.json` |
| git commit | 변경 단위 | git history |
| TODOS.md | 사용자 가시 | repo root |

### zero-touch signal file 작성
```

new_string:
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

**충족 시 동작**: signal file 의 next_n 변경 X (정상 진행). 다음 사이클 진단 단계 첫 step 에서 본 메인이 `~/.develop-cycle/skill-evolution-pending` 파일 (아래 Step 3 참조) 존재 확인 → 존재 시 `skill-evolution` chain 강제 발화 (자율 X).

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
```

- [ ] **Step 3: 글로벌 SKILL.md 동일 변경**

위 Edit 을 글로벌 파일에도 동일 적용.

- [ ] **Step 4: 변경 검증**

```bash
for f in ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md; do
  echo "=== $f ==="
  grep -c "skill-evolution-pending\|skill-evolution trigger" "$f"
done
```

Expected: 두 파일 모두 ≥ 3

- [ ] **Step 5: lockstep diff 재확인**

```bash
diff ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
```

Expected: 빈 출력

- [ ] **Step 6: 중간 commit**

```bash
git add docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
git commit -m "feat(skill): skill-evolution 자동 발화 trigger 평가 위치 명문화 + 마커 파일"
```

---

## Task 4: 발화 빈도 가드 + 신규 안전장치 추가

**Files:**
- Modify: 두 SKILL.md 파일 (실패 모드 표 확장 + 발화 빈도 가드 섹션)

- [ ] **Step 1: 실패 모드 섹션 위치 확인**

```bash
grep -n "## 실패 모드 & 안전장치" ~/.claude/skills/develop-cycle/SKILL.md
```

Expected: 1줄 출력

- [ ] **Step 2: draft 의 실패 모드 표 확장 (Edit 도구)**

`docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` 에서:

old_string:
```
## 실패 모드 & 안전장치

| 실패 | 안전장치 |
|---|---|
| chain pool 적용 조건 모호 | `dimension-cycle` 폴백 또는 신규 chain 박제 (다음 PR) |
| chain 안 sub-skill 실패 | cycle_state outcome=`fail` + retro 에 fail reason + 다음 사이클 회피 신호 |
| cycle_state JSON write 실패 | handoff save 호출 (안전망). zero-touch signal 은 OK 박제 |
| 메인이 chain 선택 잘못 | 사용자 끼어들기로 next_n=0 박제 (zero-touch stop) |
| 직전 cycle_state read 실패 (파일 없음 / 손상) | input_from_prev_cycles = [] 빈 배열 |
| 동일 chain 3회 연속 | LLM 추론 input 으로 다른 chain 우선 |
```

new_string:
```
## 실패 모드 & 안전장치

| 실패 | 안전장치 |
|---|---|
| chain pool 적용 조건 모호 | `dimension-cycle` 폴백 또는 신규 chain 박제 (다음 PR) |
| chain 안 sub-skill 실패 | cycle_state outcome=`fail` + retro 에 fail reason + 다음 사이클 회피 신호 |
| cycle_state JSON write 실패 | handoff save 호출 (안전망). zero-touch signal 은 OK 박제 |
| 메인이 chain 선택 잘못 | 사용자 끼어들기로 next_n=0 박제 (zero-touch stop) |
| 직전 cycle_state read 실패 (파일 없음 / 손상) | input_from_prev_cycles = [] 빈 배열 |
| 동일 chain 3회 연속 | LLM 추론 input 으로 다른 chain 우선 |
| 메타 chain (`expand-scope` / `design-system`) 1사이클 동시 발화 | 발화 빈도 가드 (1택). 진단 단계서 둘 다 후보면 메인 자율 1택 |
| 메타 chain 본 chain 의 직전 발화 사이클 outcome ≠ success | 다음 발화 회피 (해당 chain 만). 다른 chain 1회 success 후 가능 |
| `skill-evolution` 무한 self-trigger | 직전 3 사이클이 `skill-evolution` 이면 회피 (R3 정신). signal next_n 박제 시 마커 무시 |
| `skill-evolution` smoke test (pnpm test) fail | PR 생성 X. retro-only outcome=fail. 마커 유지 → 다음 사이클 재시도 |
| `meta-pattern` + `chain-evolution` 1사이클 동시 발화 | 자율 1택 (잡음 차단) |
| 4채널 dispatch silent skip | 단일 transport `submit-lesson.yml` — #34 PR `/commits` API fallback 이미 squash 안전 |
| SKILL.md 잘못 변경 누적 | git history 자동 백업. 사용자가 `git revert <commit>` 1회 복구 |
| 외부 SaaS 자율 결제 시도 | 본 SKILL 안 paid API 호출 명령 박제 절대 X (코드 path 자체 X) |
| 사용자에게 "이거 해주세요" 자율 요청 | carry-over 박제 채널만 (memory: subtype=needs). 직접 요청 명령 박제 X |
| Vercel/Supabase free tier 한도 도달 | `meta-pattern` dispatch + cycle outcome=fail. 자율 upgrade X |
| 사이클 hang (cycle 24 사례) | watch.sh 에 timeout (예: 30분) 후 자동 kill + interrupted cycle_state 박제 — 별도 cycle 위임 |
```

- [ ] **Step 3: 글로벌 SKILL.md 동일 변경**

- [ ] **Step 4: 변경 검증**

```bash
for f in ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md; do
  echo "=== $f ==="
  grep -c "메타 chain\|skill-evolution 무한\|cycle 24 사례\|외부 SaaS" "$f"
done
```

Expected: 두 파일 모두 ≥ 4

- [ ] **Step 5: lockstep diff**

```bash
diff ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
```

Expected: 빈 출력

- [ ] **Step 6: 중간 commit**

```bash
git add docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
git commit -m "feat(skill): 실패 모드 + 발화 빈도 가드 + 비용 가드 11건 추가"
```

---

## Task 5: 비용 가드 + 마이그레이션 path 섹션 추가

**Files:**
- Modify: 두 SKILL.md 파일 (호환성 섹션 직후)

- [ ] **Step 1: 호환성 섹션 위치 확인**

```bash
grep -n "## 호환성" ~/.claude/skills/develop-cycle/SKILL.md
```

Expected: 1줄 출력

- [ ] **Step 2: draft 에 비용 가드 + 마이그레이션 섹션 삽입 (Edit 도구)**

`docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` 에서:

old_string:
```
## 호환성

- 기존 차원 사이클 = `dimension-cycle` chain 으로 등록. 첫 시범 fire (PR #31 site) / 2nd fire (model n47) 형태와 동일
- zero-touch signal file 포맷 변경 X
- handoff carry-over 와 cycle_state 책임 분리
```

new_string:
```
## 호환성

- 기존 차원 사이클 = `dimension-cycle` chain 으로 등록. 첫 시범 fire (PR #31 site) / 2nd fire (model n47) 형태와 동일
- zero-touch signal file 포맷 변경 X
- handoff carry-over 와 cycle_state 책임 분리
- 기존 6 chain (fix-incident / explore-idea / polish-ui / review-code / operational-analysis / dimension-cycle) trigger / 시퀀스 변경 X
- 기존 lesson commit prefix (`lesson:` / `policy:` / `feedback:` / `memory:`) 변경 X. body subtype 라인 추가만
- `submit-lesson.yml` workflow 변경 X
- watch.sh 변경 X
- R7 자동 머지 정책 적용 (`skill-evolution` 포함)

## 비용 가드

| 비용 종류 | 정책 |
|---|---|
| Claude Plan token (Max 요금제) | OK — 효율 신경. 메타 스킬 발화 시 토큰 모니터, fail 시 retro-only fallback |
| 외부 서비스 결제 (Domain / 유료 SaaS / AdSense paid) | 자율 결제 절대 금지. carry-over 알림만 |
| 운영 인프라 한도 (Vercel free / Supabase free / Cloudflare Workers free) | 자율 monitor + 자율 upgrade 금지. tier 도달 시 cycle outcome=fail + `meta-pattern` dispatch |
| 사용자 시간 | 본 메인이 사용자에게 "이거 해주세요" 자율 요청 금지. carry-over 박제 채널 (`memory:` subtype=needs) 만 |

비용 가드 위반 차단 메커니즘:
- 본 SKILL 안 외부 paid API 호출 명령 박제 X (코드 path 자체 X)
- 본 SKILL 안 사용자 직접 요청 명령 박제 X (carry-over 채널만)

## 마이그레이션 path (단계적 발화)

| 단계 | 시점 | 발화 |
|---|---|---|
| 0 | 본 spec 머지 직후 | chain pool 6 → 9 즉시. 첫 사이클부터 `cycle-retro` commit 강제 |
| 1 | N ≥ 5 사이클 | `meta-pattern` / `chain-evolution` dispatch 가능 (자율 판단) |
| 2 | N ≥ 20 사이클 | `skill-evolution` 첫 발화 가능 (chain 0회 발화 trigger) |
| 3 | N = 50 milestone | `skill-evolution` 자동 발화 (50 milestone trigger) |
| 4 | N ≥ 100 누적 | 본 SKILL 가 자가 진화 N회 누적. chain pool 자체 변경 가능 |
```

- [ ] **Step 3: 글로벌 SKILL.md 동일 변경**

- [ ] **Step 4: 변경 검증**

```bash
for f in ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md; do
  echo "=== $f ==="
  grep -c "## 비용 가드\|## 마이그레이션 path\|마이그레이션 path (단계적 발화)" "$f"
done
```

Expected: 두 파일 모두 ≥ 2

- [ ] **Step 5: lockstep diff**

```bash
diff ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
```

Expected: 빈 출력

- [ ] **Step 6: 중간 commit**

```bash
git add docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
git commit -m "feat(skill): 비용 가드 + 마이그레이션 path 단계적 발화 섹션 추가"
```

---

## Task 6: SKILL.md description frontmatter 갱신

**Files:**
- Modify: 두 SKILL.md 파일 첫 줄 frontmatter `description:` (chain pool 6 → 9 반영)

- [ ] **Step 1: 현재 description 확인**

```bash
head -3 ~/.claude/skills/develop-cycle/SKILL.md
```

Expected:
```
---
name: develop-cycle
description: 머니볼 프로젝트 디벨롭 1 사이클 (진단 → chain 선택 → 시퀀스 실행 → commit + PR → 회고) 을 N번 반복. 사용자가 `/develop-cycle [N=1]` 또는 "사이클 N번 돌려" 입력 시 시작. 각 사이클은 chain pool (fix-incident / explore-idea / polish-ui / review-code / operational-analysis / dimension-cycle) 중 메인 자유 추론으로 1개 선택. cycle_state JSON 으로 사이클 사이 풍부 carry-over. agent-loop 자율 cron (2026-04-30 폐기) 의 manual 후속.
```

- [ ] **Step 2: description 갱신 (Edit 도구)**

`docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` 에서:

old_string:
```
description: 머니볼 프로젝트 디벨롭 1 사이클 (진단 → chain 선택 → 시퀀스 실행 → commit + PR → 회고) 을 N번 반복. 사용자가 `/develop-cycle [N=1]` 또는 "사이클 N번 돌려" 입력 시 시작. 각 사이클은 chain pool (fix-incident / explore-idea / polish-ui / review-code / operational-analysis / dimension-cycle) 중 메인 자유 추론으로 1개 선택. cycle_state JSON 으로 사이클 사이 풍부 carry-over. agent-loop 자율 cron (2026-04-30 폐기) 의 manual 후속.
```

new_string:
```
description: 머니볼 프로젝트 디벨롭 1 사이클 (진단 → chain 선택 → 시퀀스 실행 → commit + PR → 회고) 을 N번 반복. 사용자가 `/develop-cycle [N=1]` 또는 "사이클 N번 돌려" 입력 시 시작. chain pool 9개 (fix-incident / explore-idea / polish-ui / review-code / operational-analysis / dimension-cycle / expand-scope / design-system / skill-evolution) — 처음 6개 + expand-scope (메타 기획) + design-system (시스템 디자인) 메인 자율 선택, skill-evolution (SKILL.md 자가 갱신) trigger 충족 시 자동 발화. dispatch 채널 4종 (lesson / cycle-retro / meta-pattern / chain-evolution) submit-lesson.yml 단일 transport. cycle_state JSON + skill-evolution-pending 마커로 사이클 사이 carry-over. agent-loop 자율 cron (2026-04-30 폐기) 의 manual 후속.
```

- [ ] **Step 3: 글로벌 SKILL.md 동일 변경**

- [ ] **Step 4: 변경 검증**

```bash
for f in ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md; do
  echo "=== $f ==="
  head -3 "$f" | grep -c "expand-scope\|design-system\|skill-evolution"
done
```

Expected: 두 파일 모두 = 1 (description 1줄에 3개 모두 등장)

- [ ] **Step 5: lockstep diff**

```bash
diff ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
```

Expected: 빈 출력

- [ ] **Step 6: 중간 commit**

```bash
git add docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
git commit -m "feat(skill): description frontmatter — chain pool 9개 + dispatch 4채널 명시"
```

---

## Task 7: smoke test (pnpm test)

**Files:**
- Test: `pnpm test` 전체 (SKILL.md 변경이 코드 영향 X 검증)

- [ ] **Step 1: pnpm test 실행**

```bash
cd ~/projects/moneyballscore
pnpm test 2>&1 | tail -30
```

Expected:
- 모든 패키지 (shared / kbo-data / moneyball) 테스트 통과
- 현재 baseline 382 tests (CLAUDE.md 박제) — 변경 X
- 만약 fail → SKILL.md 변경이 코드 영향 X (markdown 만 변경) 이라 fail = 기존 flaky 테스트 또는 환경 문제. 별도 조사 필요

- [ ] **Step 2: type-check (선택)**

```bash
cd ~/projects/moneyballscore
pnpm exec tsc --noEmit 2>&1 | tail -10
```

Expected: clean (warnings 무시)

- [ ] **Step 3: lockstep diff 최종**

```bash
diff ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
```

Expected: 빈 출력

만약 diff 발견 → Task 1-6 중 어느 step 의 lockstep 깨짐. 즉시 stop, 사용자에게 보고.

- [ ] **Step 4: 두 파일 line count 확인**

```bash
GLOBAL_LINES=$(wc -l < ~/.claude/skills/develop-cycle/SKILL.md)
DRAFT_LINES=$(wc -l < docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md)
echo "global=$GLOBAL_LINES draft=$DRAFT_LINES"
```

Expected: 두 line count 동일. 240 (시작) + 약 100 (신규 섹션) = ~340 줄 예상

---

## Task 8: PR + R7 자동 머지

**Files:**
- Push: `develop-cycle/meta-expansion-impl` branch
- PR: GitHub

- [ ] **Step 1: 브랜치 push**

```bash
cd ~/projects/moneyballscore
git push -u origin develop-cycle/meta-expansion-impl 2>&1 | tail -3
```

Expected: `* [new branch]` 출력 + tracking 설정

- [ ] **Step 2: PR 생성**

```bash
gh pr create --label develop-cycle --title "feat(skill): develop-cycle SKILL.md 메타 확장 — 9 chain + 4채널 dispatch + 자가 진화" --body "$(cat <<'EOF'
## Summary

PR #64 의 spec (`docs/superpowers/specs/2026-05-04-develop-cycle-meta-expansion-design.md`) 을 SKILL.md 양쪽 (글로벌 + draft) 에 lockstep 박제.

**변경 영역**:
- chain pool 6 → 9 (expand-scope / design-system / skill-evolution 추가)
- dispatch 채널 1 → 4 (cycle-retro / meta-pattern / chain-evolution subtype)
- skill-evolution 자동 발화 trigger 평가 위치 + `~/.develop-cycle/skill-evolution-pending` 마커
- 발화 빈도 가드 + 비용 가드 + 마이그레이션 path 섹션
- description frontmatter 갱신 (9 chain + 4채널 명시)

**테스트**: `pnpm test` 통과 (382 tests baseline 변경 X)

## 변경 commit (영역별 6개)

1. `feat(skill): chain pool 6 → 9` (expand-scope/design-system/skill-evolution 표 추가)
2. `feat(skill): dispatch 채널 1 → 4` (cycle-retro/meta-pattern/chain-evolution subtype)
3. `feat(skill): skill-evolution 자동 발화 trigger 평가 위치 명문화 + 마커 파일`
4. `feat(skill): 실패 모드 + 발화 빈도 가드 + 비용 가드 11건 추가`
5. `feat(skill): 비용 가드 + 마이그레이션 path 단계적 발화 섹션 추가`
6. `feat(skill): description frontmatter — chain pool 9개 + dispatch 4채널 명시`

## 마이그레이션 path

- Step 0: 본 PR 머지 직후 chain pool 6 → 9 즉시. 첫 사이클부터 cycle-retro commit 강제
- Step 1: N ≥ 5 사이클 = meta-pattern / chain-evolution dispatch 가능
- Step 2: N ≥ 20 사이클 = skill-evolution 첫 발화 가능
- Step 3: N = 50 milestone = skill-evolution 자동 발화

## Test plan

- [ ] CI green (type-check + test)
- [ ] R7 자동 머지 (이 PR = `develop-cycle/` prefix + 외부 작성자 X + 100+ 파일 X)
- [ ] 머지 후 사용자가 `/develop-cycle N` 호출 → 새 9 chain pool 로 재개
- [ ] 첫 사이클의 cycle-retro commit 정상 박제 확인

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" 2>&1 | tail -3
```

Expected: PR URL 출력

- [ ] **Step 3: R7 자동 머지 활성화**

```bash
PR_NUM=$(gh pr view --json number -q .number)
echo "PR #$PR_NUM"
gh pr merge $PR_NUM --squash --auto --delete-branch 2>&1 | tail -3
```

Expected: `Pull request #N will be automatically merged via squash when all requirements are met`

- [ ] **Step 4: 머지 확인 (CI 시간 기다림)**

```bash
sleep 60
gh pr view --json state,mergeStateStatus
```

Expected: state=MERGED 또는 state=OPEN + mergeStateStatus=BLOCKED (CI 진행 중) — 후자면 더 기다림

CI 진행 중이면 polling:
```bash
until gh pr view --json state -q .state | grep -q "MERGED"; do sleep 30; done
echo "MERGED at $(date)"
```

만약 CI fail → PR 머지 안 됨. 별도 조사 (smoke test 통과한 것과 별개로 CI flaky 가능). 사용자에게 보고.

- [ ] **Step 5: main pull + 글로벌 SKILL.md 최종 동기 확인**

```bash
git checkout main
git pull origin main --ff-only
git log --oneline -5
diff ~/.claude/skills/develop-cycle/SKILL.md docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
```

Expected: HEAD 가 신규 머지 commit. diff 빈 출력 (lockstep 유지).

- [ ] **Step 6: 사용자에게 완료 보고 + 재개 path 안내**

보고 형식:
```
✅ SKILL.md 메타 확장 완료
- PR #N 머지 (commit hash)
- chain pool: 6 → 9
- dispatch 채널: 1 → 4
- skill-evolution 자동 발화 활성화

다음:
1. 사용자가 /develop-cycle 50 (또는 N) 호출 → 새 9 chain pool 로 재개
2. 첫 사이클부터 cycle-retro commit 강제 박제 → submit-lesson workflow → 허브 dispatch
3. N ≥ 5 도달 시 meta-pattern / chain-evolution 발화 가능
```

---

## Self-Review (plan 작성 후 fresh eyes 확인)

**1. Spec coverage check**:
- spec § 1 비용 가드 → Task 5 ✅
- spec § 2 아키텍처 변경 요약 → Task 1, 2, 3 (체인 pool + 채널 + skill-evolution) ✅
- spec § 3 신규 chain 3개 → Task 1 ✅
- spec § 4 4채널 dispatch → Task 2 ✅
- spec § 5 SKILL 자가 진화 안전장치 → Task 4 ✅
- spec § 6 호환성 → Task 5 (호환성 표 확장) ✅
- spec § 7 실패 모드 종합 → Task 4 ✅
- spec § 8 마이그레이션 path → Task 5 ✅
- spec § 9 spec write 안전 절차 → Task 0 (사전 준비 + branch) ✅
- spec § 10 다음 단계 → Task 8 Step 6 (보고) ✅
- spec § 11 참조 → 본 plan 자체가 참조 (별도 task 불필요)

gap: 없음. 모든 spec 섹션이 task 1-8 안에 매핑됨.

**2. Placeholder scan**:
- "TBD" / "TODO" / "implement later" — 없음
- 각 step 의 code/command 모두 명시됨 (no "appropriate error handling")
- 모든 Edit 의 old_string / new_string 완전 박제

**3. Type/naming consistency**:
- chain slug 일관: `expand-scope` / `design-system` / `skill-evolution` (전 task 동일)
- subtype 일관: `cycle-retro` / `meta-pattern` / `chain-evolution` / `lesson` (전 task 동일)
- 마커 파일 path 일관: `~/.develop-cycle/skill-evolution-pending` (Task 3, 4 모두)
- workflow 명 일관: `submit-lesson.yml` (전 task 동일)
- branch 일관: `develop-cycle/meta-expansion-impl` (Task 0, 8 동일)

이슈 없음.

---

## 실패 시 회복 path

| Task | 실패 | 회복 |
|---|---|---|
| Task 0 | 두 파일 lockstep 깨짐 | 사용자에게 어느 쪽이 진실인지 confirm. 진실 파일을 다른 쪽에 cp 후 재시작 |
| Task 1-6 | Edit old_string 매칭 실패 | 직전 grep 으로 line 번호 + 컨텍스트 재확인. 변경된 line 보고 old_string 재작성 |
| Task 1-6 | lockstep diff 발견 | 차이 line 보고 어느 쪽이 의도된 변경인지 판단. 다른 쪽 동기 |
| Task 7 | pnpm test fail | SKILL.md 변경이 코드 영향 X. flaky test 의심. 동일 commit 재테스트 또는 사용자 confirm 후 PR (smoke test 의도 = 본 SKILL 영향 X 검증, flaky 면 별도 cycle 위임) |
| Task 8 | PR CI fail | CI log read. SKILL.md 변경이 type-check / lint 영향 X. flaky 또는 base branch 문제. 사용자 confirm 후 머지 또는 별도 조사 |
| Task 8 | R7 자동 머지 안 됨 | label / draft / 100+ 파일 / 외부 작성자 등 R7 예외 조건 확인. 모두 X 면 manual `gh pr merge --squash --delete-branch` |

---

## 마지막 체크

- [ ] Task 0 ~ 8 = 9개 task. 각 task = 6 step. 총 54 step
- [ ] 두 SKILL.md 파일 lockstep 매 task 끝 + Task 7 최종 diff
- [ ] 6 영역 commit 박제 (Task 1-6 각 1 commit)
- [ ] smoke test = pnpm test 통과 (Task 7)
- [ ] R7 자동 머지 (Task 8)

본 plan 따라 구현 시 SKILL.md 메타 확장 1회 PR 로 박제. 머지 후 사용자가 `/develop-cycle N` 호출하면 새 9 chain pool 로 재개.
