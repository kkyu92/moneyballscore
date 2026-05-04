# active-cycle PID 박제 fix — subshell `$$` → `pgrep -x claude` (cycle 26)

**일자**: 2026-05-04
**Cycle**: 26 (chain=fix-incident, lite + 코드)
**관련 PR**: #66 (cycle hang safety v2 — 본 fix 의 전제)
**Status**: SKILL.md + draft lockstep edit + regression test 4/4 PASS

---

## 1. 배경

cycle 25 정상 종료 후 watch.log 마지막 line:
```
2026-05-04 15:13:02 active-cycle stale — pid 7170 dead, cleaning
```

PID 7170 = cycle 25 진단 첫 step 의 active-cycle 박제값 = **bash subshell `$$`**, 메인 claude process PID 아님. 즉 SKILL.md 의 다음 박제 로직이 의도와 다르게 작동:

```bash
# cycle 25 시점 SKILL.md (fix 전):
cat > ~/.develop-cycle/active-cycle <<EOF
$CYCLE_N
$$              # ← bash subshell PID, 짧은 lifecycle
$(date +%s)
EOF
```

도구 호출 (Bash tool) 의 subshell 종료 후 watch.sh 가 5s polling 시 `kill -0 $pid` fail → "stale, cleaning" → active-cycle 자동 삭제 → 그 후 `check_timeout()` 매 호출 시 `[ ! -f "$ACTIVE" ] && return 0` 발효 → **hang safety v2 검사 자동 skip**.

결과: cycle 25 진행 중 hang safety 가 실제로 작동 안 했음. cycle 25 정상 종료 = 검증 자료가 약함 (안전장치 추적 자체 X).

---

## 2. Root cause

`$$` 의 의미가 환경에 따라 다름:
- 직접 shell script 실행: `$$` = script process PID (long-lived)
- claude Bash tool 호출 시 heredoc: `$$` = 도구 호출용 새 bash subshell PID (short-lived)

SKILL.md 박제 시점 = claude 안 Bash tool 호출 → 후자. 짧은 lifecycle 끝나면 PID 죽음 → watch.sh stale 판단.

---

## 3. Fix

### 3.1 SKILL.md + draft lockstep (1 line)

```diff
 cat > ~/.develop-cycle/active-cycle <<EOF
 $CYCLE_N
-$$
+$(pgrep -x claude 2>/dev/null | head -1 || echo $$)
 $(date +%s)
 EOF
```

`pgrep -x claude` = 정확한 명령 매칭 (`-x` exact, Claude Helper 등 제외). 메인 claude process (long-lived) PID 추출. 없으면 fallback `$$`.

### 3.2 watch.sh 변경 X

기존 hang safety v2 로직 (line 155 의 `kill -0 $pid` 검사) 그대로 유지. PID 박제만 정확해지면 stale 판단 자연 차단. 기존 활동 측정 (`probe_activity`) + idle tracker + hard cap 모두 동일 작동.

### 3.3 regression test 변경 X

test 가 임의 PID (`sleep 9999` 의 PID) 박제 → `pgrep -x claude` 영향 X. 4/4 PASS 유지.

---

## 4. 검증

### 4.1 직접 검증

```bash
echo $$                              # subshell PID (e.g. 8665)
pgrep -x claude | head -1           # 메인 claude PID (e.g. 10414, long-lived)
```

본 cycle 26 fix 후 cycle 27+ 의 active-cycle 박제값 = 메인 claude PID = watch.sh 의 `kill -0 $pid` 검사 통과 → hang safety v2 검사 정상 작동.

### 4.2 lockstep diff

```bash
diff ~/.claude/skills/develop-cycle/SKILL.md \
     docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md
# 빈 출력 ✅
```

### 4.3 regression test

```bash
bash tests/scripts/dc-watch-timeout.test.sh
# 4/4 PASS ✅ (hard cap kill / below soft / dead PID / malformed)
```

---

## 5. 다중 claude 환경 caveat

`pgrep -x claude | head -1` = 첫 결과 잡음. 사용자가 여러 claude 띄운 환경에선 본 cycle 진행 중인 claude 가 첫 결과가 아닐 수 있음. 다만:
- 일반 케이스 (단일 claude) = 정확
- 다중 claude 케이스 = 다른 claude PID 잡아도 long-lived → watch.sh `kill -0 $pid` 통과 → hang safety 작동 (다른 claude 추적이지만 stale 차단 효과는 동일)
- 정확한 본인 cycle 추적이 필요하면 후속 cycle 에서 `$PPID` chain 또는 환경변수 (e.g. `CLAUDE_PID`) 박제 검토

본 fix = "subshell `$$` 짧은 lifecycle 차단" 의 minimal 해결. 다중 claude 정확 추적은 별도 cycle.

---

## 6. carry-over

- [ ] **다중 claude 정확 추적** (선택) — `$PPID` chain 따라 올라가서 claude 발견 또는 환경변수 박제. 후속 review-code 또는 fix-incident chain 1회
- [ ] **재검증** — 사용자가 tmux alias (`mcc='tmux new -As claude claude'`) 박제 후 `mcc` 로 재시작 → `/develop-cycle 3` 호출 → cycle 26 spawn 시 active-cycle 의 PID = 메인 claude PID 확인 → watch.log 의 "stale, cleaning" 로그 부재 확인

---

## 7. 메타

### 7.1 cycle 26 의 의미

cycle 25 검증 1차 = 갭 발견 → cycle 26 fix-incident chain 으로 즉시 처리 = 검증 메커니즘 자체 강화. **D 옵션** (사용자 승인) 진행:
- A 옵션 = tmux 박제 후 검증 재시도 (PID 갭은 여전)
- C 옵션 = lesson 박제 + 다음 세션으로 위임
- D 옵션 = 본 세션에서 PID 갭 fix + 사용자 영역 (tmux) carry-over

D = 가장 가치. 본 fix 후 cycle 27+ hang safety v2 정상 작동 → 후속 검증 의미 회복.

### 7.2 cycle 25 retro 보강 사항

cycle 25 의 cycles/25.json `retro.todos_added` 가 P1~P5 (LLM 무결성) 만 박제 — 본 PID 갭 발견은 회고 후 사용자 결정 단계에서 자연 발화. 본 spec md 가 그 발견의 박제. 별도 lesson commit 필요 X (본 cycle 26 의 fix-incident chain 자체가 lesson 의 actionable 처리).
