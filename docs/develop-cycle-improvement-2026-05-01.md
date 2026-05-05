# develop-cycle skill 개선 design — 10회 무리없는 운영

**Date**: 2026-05-01
**Trigger**: 사용자 발화 "10회까지 무리없이 세션 좋은 상태를 만들면서 작업이 되었으면 좋겠어"
**Decision maker**: 본 메인 (사용자 axis 위임)
**Implementation 영역**: `~/.claude/skills/develop-cycle/SKILL.md` (글로벌, 허브측 작업 영역). 본 design 은 reference 박제 — 실제 갱신은 허브 작업 시점에 반영.

**진행 박제**:
- 2026-05-06 cycle 124 skill-evolution 8 = PASS counter 분리 (PASS_eval / PASS_ship) + ship-0 emergency stop (직전 10 cycle partial → next_n=0 강제) + lite chain retro-only cap (5 연속 retro-only → cooldown N=10) 3건 SKILL.md 갱신. cycle 86~122 = 37 cycle ship 0 streak 후속. spec: `docs/superpowers/specs/2026-05-06-cycle-124-skill-evolution-8.md`

---

## 1. 문제 정의

`/develop-cycle 1` 시범 fire (2026-05-01) 1회 완료. 사용자 희망: **N=10 까지 메인 세션 컨텍스트 무리 없이 운영**. 다른 axis (워커 가시성 / 메인 의사결정 부담 / 박제 누락) 는 부차적.

### 메인 conversation 누적 출처 (cycle당 추정)

| 출처 | cycle당 토큰 | 10 cycle 누적 |
|---|---|---|
| Step 1 진단 (gh issue + TODOS + git log + pnpm test stdout) | ~3~5k | 30~50k |
| Step 4 dispatch payload + 팀원 mailbox 회신 (PR diff 포함) | ~4~8k | 40~80k |
| Step 5 회고 검증 표 (4건 명령 결과) | ~1~2k | 10~20k |
| Step 6 박제 (SKILL.md/CLAUDE.md/TODOS.md edit + lesson commit) | ~2~4k | 20~40k |
| **총합** | **~10~20k/cycle** | **~100~200k** |

handoff save/load 자체도 새 세션 SessionStart base (~50k+ hub-update / knowledge-update / skill list) 와 합치면 carry-over 자주 = net 손해. **root cause = cycle당 토큰 자체 줄이기**.

---

## 2. 채택 결정

**A + B 묶음**. C 비추, D 보류.

| Axis | 결정 | 근거 |
|---|---|---|
| A. 진단 슬림화 | **채택** | root cause 직격, SKILL.md R6 명세 보존 |
| B. 점진 검증 (Tier) | **채택** | 첫 fire 박제 5건 같은 미발견 갭 단계별 자연 폭로 |
| C. carry-over 가속 (60→50%) | 비추 | 새 세션 base 50k+ 합치면 net 손해 |
| D. 아키텍처 전환 (subagent dispatch) | 보류 | 가장 큰 절감 (~4~8k → ~1~2k) 이지만 R6 명세 큰 변경 + 첫 fire 박제 1·3번 의미 무효 risk. Tier 4 도달 후 별 도전 후보 |

---

## 3. SKILL.md 갱신 candidate 5건

### Candidate 1 — Step 1 진단 슬림화

**현재**:
```
병렬 실행:
1. gh issue list ...
2. cat TODOS.md
3. git log --oneline -15
4. pnpm test 또는 pnpm typecheck
5. (선택) gstack/health
6. (선택) Brier / 적중률
```

**변경**:
```
**Cycle 1 (full scan)**:
1. /tmp/diag-cycle-1.txt 에 dump:
   gh issue list ... > /tmp/diag-cycle-1.txt
   cat TODOS.md >> /tmp/diag-cycle-1.txt
   git log --oneline -15 >> /tmp/diag-cycle-1.txt
   pnpm test 2>&1 | tail -3 >> /tmp/diag-cycle-1.txt
2. 메인은 1줄 요약만 read:
   "issue N건 / TODOS 변화 N개 / git log N개 / tests pass"
3. 의심 시 메인이 grep / head 로 detail read

**Cycle 2~N (incremental)**:
1. /tmp/diag-cycle-N.txt 에 dump:
   gh issue list --search "updated:>=<cycle-1-end>" > ...
   git log --oneline --since="<last_cycle_end>" > ...
   diff <(cat TODOS.md) /tmp/diag-cycle-1-todos.txt > ...
2. 메인 1줄 요약만 read
```

**효과**: cycle당 진단 토큰 ~3~5k → ~0.5k.

---

### Candidate 2 — 새 섹션 "점진 검증 단계"

| Tier | N | 통과 기준 | 현재 상태 |
|---|---|---|---|
| **Tier 1** | 1 | 첫 fire 박제 5건 (label / main checkout / shutdown race / scope-prefix / 영역 분리) 모두 차단 검증 | ✅ 통과 (2026-05-01) |
| **Tier 2** | 3 | Tier 1 통과 + 박제 신규 0~2건 (cycle별) | 미진행 |
| **Tier 3** | 5 | Tier 2 통과 + carry-over 1회 매끄러움 검증 | 미진행 |
| **Tier 4** | 10 | Tier 3 통과 + 차원 분배 round-robin 균형 + 박제 신규 0건 | 미진행 |

각 Tier 완료 후 `/handoff save` 박제. 박제 신규 발견 시 SKILL.md 갱신 → 다음 Tier.

**자연 트리거 매칭**: model 차원 N=50 도달 (5/3~5/5 예상) = Tier 2 (`/develop-cycle 3`) 첫 자연 후보.

---

### Candidate 3 — Step 4-2 dispatch payload 압축

**현재**:
```
Mailbox to <차원>:
  Task: <slug>
  Context: <Issue 또는 진단 결과>
  Skill 시퀀스: <차원별 시퀀스 풀 박힘 — 15~20줄>
  Branch: develop-cycle/<YYYYMMDD>-<slug>
  PR title: ...
  Commit prefix: ...
  Done when: ...
```

**변경**:
```
Mailbox to <차원>:
  Task: <slug>
  Context: <1~2줄>
  Skill 시퀀스: per SKILL.md "차원별 skill 시퀀스" 참조
  Branch: develop-cycle/<YYYYMMDD>-<slug>
  PR title: <차원>: <한줄>
  Commit prefix: <prefix>
  Done when: pnpm test OK + verification-before-completion + label 부착 + git checkout main
```

**효과**: dispatch payload ~15줄 → ~5줄. cycle당 ~50% 감축.

---

### Candidate 4 — Step 5 회고 검증 표 file dump

**변경**:
```
4건 검증 명령 결과를 /tmp/cycle-N-verify.txt 에 dump:
  git diff main..HEAD --stat >> /tmp/cycle-N-verify.txt
  pnpm test 2>&1 | tail -3 >> ...
  gh pr view <N> --json labels >> ...
  gh run list -w submit-lesson.yml --limit 5 --json conclusion >> ...

메인은 "4/4 통과" 1줄만 read. 실패 시 grep 으로 detail.
```

**효과**: cycle당 ~1~2k → ~0.2k.

---

### Candidate 5 — review skill 자율 호출 조건 (trigger 박제)

**현재**: 차원별 skill 시퀀스에 review 명시 박제. site 만 `plan-design-review` (해당 시). acquisition / model 에 `plan-eng-review` / `plan-ceo-review` 없음. 자율 호출 메커니즘 부재.

**변경**:

차원별 시퀀스는 그대로 (안전망). 추가로:

(1) **새 섹션 "review skill 자율 호출 조건"** 박제 — 워커 self-check + 메인 cross-check:

```
## review skill 자율 호출 조건 (워커 self-check)

워커는 작업 시작 시 task description 을 다음 trigger 와 매칭. 매칭 시
해당 plan-X-review 자율 호출 후 구현 진입.

| Review | trigger 신호 | 차원 |
|---|---|---|
| plan-design-review | UI 컴포넌트 / 레이아웃 / 페이지 변경 | site, acquisition |
| plan-eng-review | architecture / 마이그레이션 / 큰 인터페이스 변경 | 주로 model |
| plan-ceo-review | (1 cycle 단위 X — 메타 회고 시점만) | N 도달 |

매칭 X 면 skip.
```

(2) **dispatch payload 1줄 추가** (Step 4-2):
```
Done when: ... + review trigger 매칭 시 해당 plan-X-review 자율 호출 박제
```

(3) **Step 5 회고 검증 표 5번 항목 신설** — 메인 cross-check:
| 검증 항목 | 명령 | 의도 매칭 |
|---|---|---|
| 5. review 자율 호출 적정성 | task description trigger 매칭 vs 워커 호출 history | 매칭 → 호출 / 매칭 X → skip 일치 |

**효과**:
- review 호출은 자율 → 호출 X 시 +0 토큰, 호출 시 +5~10k. cycle당 평균 영향 작음
- 시퀀스 명시 박제 회피 → SKILL.md 가벼움 유지
- N=5+ 운영 중 자율 판단 패턴 박제 (어느 차원에서 어느 review 가 자주 호출되는지) → Tier 4 도달 후 시퀀스 박제 결정 자연 자료

**잔여 risk**:
- 자율 판단 미스 (필요한데 호출 X) — 안전망: 회고 검증 표 5번 cross-check
- Tier 2 (N=3) skip 시 자율 판단 패턴 자연 폭로 갭 ↑ — 본 design Section 2 의 Tier 2 → 3 직행 결정과 같은 risk axis

---

## 4. 누적 효과 추정

| | 현재 | 변경 후 |
|---|---|---|
| cycle당 메인 토큰 | ~10~20k | ~3~5k |
| 10 cycle 총 | ~100~200k | ~50~80k |
| carry-over 횟수 (200k context window 가정) | 5~10회 | 1~2회 |

**Tier 4 (N=10) carry-over 1~2회 한 세션 가능 영역 도달**.

---

## 5. 실제 적용 경로

본 design 은 reference 만. 실제 갱신:

1. 사용자가 허브측 SKILL.md 갱신 작업 진행 시점 → 본 design 참조
2. 글로벌 `~/.claude/skills/develop-cycle/SKILL.md` 4 곳 직접 수정 (Candidate 1~4)
3. 갱신 후 다음 자연 트리거 (`/develop-cycle 3`, model 차원 N=50 도달) 시 Tier 2 시도
4. Tier 2 통과 → Tier 3 → Tier 4 점진

본 메인은 본 design 박제 + 다음 세션이 git log 로 자연 발견 가능하게 commit. SKILL.md 글로벌 직접 수정은 X (허브 영역).

---

## 6. Tier 1 통과 검증 명령 (현재 상태 박제용)

```bash
# 박제 1: develop-cycle label 존재
gh label list --search develop-cycle

# 박제 2: 워커 main checkout — develop-cycle/<slug> branch 가 origin 안 잘려있나
git ls-remote origin "refs/heads/develop-cycle/*"

# 박제 3: shutdown race condition — graceful 종료 정상 (TeamDelete 성공)
# 첫 fire (PR #31) + 두 번째 fire (PR #32) 양쪽 종료 정상 = 통과 박제됨

# 박제 4: scope-prefix matcher — PR #33 (c587b3e) fix 머지됨
git log --grep="lesson(skill)" --since="2026-05-01" --oneline

# 박제 5: 영역 분리 — PR #31 / #32 모두 영역 분리 위반 0건 박제됨
gh pr view 31 --json files | jq '.files | length'
gh pr view 32 --json files | jq '.files | length'
```

---

## 7. 보류 사항 (D — 추후 검토)

**아키텍처 전환 (Agent Teams → subagent dispatch)** 은 가장 큰 절감 잠재력 (~4~8k → ~1~2k) 이지만:
- SKILL.md R6 명세 큰 변경 (TeamCreate / mailbox / shutdown 시퀀스 폐기)
- 첫 fire 박제 1번 (iTerm2 시각화 X) 무효 — 이건 OK (어차피 X)
- 첫 fire 박제 3번 (shutdown race) 무효 — subagent 는 race 자체 X
- Agent Teams 강점 (영구 mailbox / 다중 워커 동시 작업) 잃음

**조건**: Tier 4 (N=10) 운영 안정 도달 후 메트릭 (cycle당 토큰 / carry-over 횟수 / 박제 신규 0건 지속 기간) 관찰. 명세 변경 ROI > 리스크 시점 도래하면 별 design 진행.

---

## 부록 — 첫 fire 결과 박제 (2026-05-01 시점)

| Cycle | PR | 차원 | 결과 |
|---|---|---|---|
| 1 (5/1 09:00) | #31 (`d41bed1`) | site | +203/-5, 145 tests pass, 영역 분리 위반 0, label 부착, 박제 5건 식별 |
| 2 (5/1 09:55) | #32 (`604b227 merge`) | model | N=47 표본 축적 결정 + H5 임계 도달 박제. lesson(model) commit aa13056 |

박제 5건 모두 SKILL.md 반영됨 (5/1 09:09 lesson(skill) commit a83f75f + 후속 PR #33 c587b3e fix). Tier 1 통과.

---

## 부록 2 — N=3 한 세션 fire 결과 (2026-05-01 KST)

본 design doc 박제 직후 (`4d4e448` + `d9eb6a4`) `/develop-cycle 3` 자연 호출 — **Candidate 1~5 미적용 base** 에서 한 세션 N=3 강행 통과 자료. 향후 SKILL.md 갱신 후 비교 base.

### Cycle 결과

| Cycle | 차원 | PR | merge sha | 변경 |
|---|---|---|---|---|
| 1/3 | acquisition | #36 | `1fea1ce` | sitemap `/players/[id]` 추가 (+20 -2) |
| 2/3 | model | #37 | `0ebc215` | calibration sparse-history regression test (+52) |
| 3/3 | site | #38 | `97688b4` | PlaceholderCard 메시지 + a11y (+76 -7) |

메타 회고 lesson commit: `c0d44d3` (submit-lesson run `25219228819` success → 허브 dispatch).

### 차원 분배 (5/1 + 본 fire 누적)
site 1 / model 2 / acquisition 1 — round-robin 균형.

### 박제 신규 2건 (Tier 2 통과 기준 0~2 충족)

1. **메인 task 명세 라우팅 갭** (Cycle 1)
   - dispatch 시 `/players/[name]` (실제 `[id]`), `/reviews/[date]` (존재 X, weekly/monthly 만) 표현 부정확
   - 워커 자율 정정 통과
   - SKILL.md Step 4-2 dispatch payload 작성 시 "라우팅 구조 사전 확인" 권장 후보

2. **워커 자율 머지 dispatch payload consistency 갭** (Cycle 2)
   - Cycle 1 spawn prompt "워커는 PR 생성까지만" 명시 / Cycle 2 누락 → 워커가 R7 정신 따라 자체 머지
   - 사고 X, Cycle 3 명시화로 해결
   - SKILL.md Step 4-2 표준 template 통일 후보

### Candidate 5 (review trigger 박제) 작동 1차 검증

3/3 워커 모두 자율 판단 정확:
- acquisition: sitemap 메타만 → 모든 review skip 정상
- model: test 추가만 → eng-review skip 정상
- site: 단일 컴포넌트 a11y → design-review skip 판단 정상

**Candidate 5 시퀀스 명시 박제 회피 결정 정당화 입증**.

### 5/1 박제 5건 차단 검증

| 박제 | 결과 |
|---|---|
| iTerm2 시각화 X | 변동 없음 (tmux 백엔드만, 사용자 화면 비가시 그대로) |
| label 부착 | 3/3 ✓ |
| shutdown race | 1/3 재발 (acquisition 18초 차 idle_notification) — 메커니즘 한계, graceful 영향 X |
| main checkout | 3/3 ✓ |
| scope-prefix matcher | 3건 모두 head_commit 4 prefix 외 → 정상 skip |
| 영역 분리 위반 | 0/3 ✓ |

### 세션 자가 추정 (R3)

| 신호 | 값 |
|---|---|
| 대화 turn 누적 | ~30+ |
| 도구 호출 누적 | ~50+ |
| system reminders | 5건+ (task tools 권유 반복) |
| 대형 docs / skill list 노출 | 7~8회 |
| **자가 추정 컨텍스트** | **~75~85% 근처** |

### Tier 2 통과 — Tier 3 (N=5) 도전 조건

한 세션 N=3 = ~75~85% 도달. **Tier 3 (N=5) 한 세션 도전 시 Candidate 1~4 적용 필수**. 갱신 전 Tier 3 도전 시 carry-over 1회 자연 발생.

### 본 fire 가 design candidate 별 검증 자료

| Candidate | 본 fire base | 갱신 후 비교 가능 |
|---|---|---|
| 1. 진단 슬림화 | 매 cycle full scan ~3~5k 진단 토큰 | 적용 후 ~0.5k (10x 절감 추정) |
| 2. Tier 점진 | Tier 1 → Tier 3 (Tier 2 skip) — 박제 신규 2건 자연 폭로 | Tier 2 정식 진행 시 신규 발견 패턴 비교 |
| 3. dispatch payload 압축 | spawn prompt ~1.5~2k × 3 | 압축 후 ~0.5k × 3 |
| 4. 회고 검증 표 file dump | cycle당 ~1~2k | ~0.2k |
| 5. review trigger 자율 호출 | **3/3 워커 정확 판단 — 작동 검증 통과** | 갱신 시 시퀀스 박제 회피 결정 그대로 |

### 다음 자연 트리거

- model N=50 표본 도달 (5/3~5/5 예상) → `/develop-cycle 1` (model) 또는 `/develop-cycle 5` (Tier 3 도전)
- 5/7 KST 09:30 retrospective routine (`trig_01FbjATFftDz3bxT89YXUin2`) 자동 fire — 본 fire + 5/1 두 fire 통합 회고 대상
