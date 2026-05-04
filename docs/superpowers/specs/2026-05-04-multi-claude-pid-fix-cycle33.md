# 다중 claude 환경 PPID chain 매칭 — active-cycle PID race fix (cycle 33)

**일자**: 2026-05-04
**Cycle**: 33 (chain=fix-incident, lite + 코드)
**관련 PR**: cycle 26 PR #68 (`pgrep -x claude` 첫 결과 fix), cycle 33 본 PR
**Status**: SKILL.md + draft lockstep edit + smoke test 검증 완료

---

## 1. 배경

cycle 26 fix (`pgrep -x claude 2>/dev/null | head -1`) 가 cycle 27~32 6 cycle 정상 fire 검증. 그러나 다중 claude 환경 (사용자가 mcc 외 다른 claude 띄운 환경) 에서 잠재 race:

- `pgrep -x claude` = 시스템 안 모든 'claude' 명령 process 반환
- `head -1` = 첫 결과만. PID 순서 = 시작 순. 본 도구 bash 를 띄운 메인 claude 와 무관

본 환경 검증 결과:

```
$ pgrep -x claude
10414     # 다른 mcc 또는 별도 claude (다중)
85215     # 또 다른 claude (예: /handoff load)

$ # 본 도구 bash 의 PPID chain 거슬러
$ # 도구 bash → tmux session → 본 메인 claude
60808     # 정확한 본 메인 (3일 19시간 elapsed, claude-swarm-60808)
```

**즉 cycle 26 fix 가 다중 claude 환경에서 wrong PID 박제 → watch.sh 가 wrong PID 활동 측정 → 본 메인 hang 시에도 wrong PID 살아있으면 hang safety 무효**.

---

## 2. Root cause

`pgrep -x claude` = process 목록 검색 (semantic: "claude 명령" 찾기). 본 도구 bash 의 ancestor chain 정보 X.

본 도구 bash 의 chain:
```
Bash tool 호출
  ↓ spawn
도구 bash subshell ($$ = 21408)
  ↓ PPID
tmux client (60808 — 본 메인 claude, comm='claude')
  ↓ PPID
parent shell (60803, comm='caffeinate' 또는 '/bin/sh')
  ↓ ...
init (1)
```

`pgrep` 은 chain 안 본 메인 (60808) 잡지 못함. `head -1` 의 첫 결과 = 알파벳 순 / PID 순 정렬에 따라 다른 claude (10414) 가 위 (= cycle 25 lesson 의 wrong PID race 와 동일 카테고리).

---

## 3. Fix

### 3.1 PPID chain 매칭 (SKILL.md + draft lockstep)

```diff
-cat > ~/.develop-cycle/active-cycle <<EOF
-$CYCLE_N
-$(pgrep -x claude 2>/dev/null | head -1 || echo $$)
-$(date +%s)
-EOF
+# 본 도구 bash 의 PPID chain 거슬러 첫 'claude' comm process 매칭 (다중 claude 환경 안전)
+P=""
+PROBE=$$
+for _ in 1 2 3 4 5 6 7 8; do
+  PROBE=$(ps -p "$PROBE" -o ppid= 2>/dev/null | tr -d ' ')
+  { [ -z "$PROBE" ] || [ "$PROBE" = 1 ]; } && break
+  case "$(ps -p "$PROBE" -o comm= 2>/dev/null | xargs basename 2>/dev/null)" in
+    claude|claude.exe|claude-code) P=$PROBE; break ;;
+  esac
+done
+[ -z "$P" ] && P=$(pgrep -x claude 2>/dev/null | head -1 || echo $$)
+cat > ~/.develop-cycle/active-cycle <<EOF
+$CYCLE_N
+$P
+$(date +%s)
+EOF
```

**로직**:
1. 도구 bash subshell PID (`$$`) 부터 시작
2. 최대 8 hop PPID chain 거슬러 올라감 (충분한 깊이)
3. 매 hop comm 명령이 'claude' / 'claude.exe' / 'claude-code' 면 매칭 → P 박제
4. chain 끝 (init) 도달 또는 매칭 X → fallback `pgrep -x claude | head -1` (cycle 26 로직)
5. fallback 도 실패 → fallback `$$` (cycle 25 이전 동작, 단명 PID)

**3 단 fallback** = cycle 25 lesson + cycle 26 fix + cycle 33 fix 모두 carry-over.

### 3.2 변경 파일

| 파일 | 변경 |
|---|---|
| `~/.claude/skills/develop-cycle/SKILL.md` (글로벌) | line 106-114 (~10 line 추가) |
| `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` (repo mirror) | 동일 (lockstep) |
| `docs/superpowers/specs/2026-05-04-multi-claude-pid-fix-cycle33.md` (본 spec) | 신규 |

watch.sh 변경 X — `kill -0 $pid` 검증만으로 PID 박제값 신뢰. PPID chain 매칭이 박제 시점 정확도 보장 = watch.sh 추가 verify 불필요.

---

## 4. 검증 (smoke test)

본 환경에서 직접 실행:

```
=== smoke test PPID chain ===
  hop probe=60808 comm=claude
  MATCH at 60808
=== resolved P=60808 ===
  PID  PPID COMM      ETIME
60808 60803 claude    03-19:42:30
```

**대조**:
- `pgrep -x claude | head -1` = 10414 (wrong, 다른 mcc claude)
- PPID chain 매칭 = 60808 (정확, 본 메인 claude, 3일 19시간 경과)

**즉 cycle 26 fix 가 wrong PID 박제하던 경우 = 본 fix 로 정확 PID 박제로 전환**.

---

## 5. Carry-over

### cycle 25 lesson → cycle 26 fix → cycle 33 fix

| Cycle | 박제 로직 | 한계 |
|---|---|---|
| 25 이전 | `$$` (subshell) | 단명 PID. 도구 bash 종료 시 stale → watch.sh cleaning → hang safety 무효 |
| 26 (PR #68) | `pgrep -x claude \| head -1` | 단일 claude 환경 OK. 다중 claude 환경 시 wrong PID race |
| 33 (본 PR) | PPID chain 매칭 + 2 단 fallback | 본 도구 bash 의 ancestor 매칭. 다중 claude 환경 안전 |

### 다음 cycle 영향

cycle 34+ active-cycle PID 박제 = PPID chain 매칭. watch.sh 의 hybrid timeout 검사 (`probe_activity()`) 가 정확한 본 메인 PID 활동 측정 → soft 45m + idle 5m 누적 또는 hard 60m 시 정확한 hang 감지 + 자동 kill.

특히 cycle 34~38 expand-scope chain step 펼침 (brainstorming / office-hours / ceo / eng / design / writing-plans) 의 sub-skill 들 = 메타 작업 hang 위험 영역. 본 fix 가 보호망 정확도 보장.

---

## 6. 검증 한계

- **다중 claude 환경 hang 실측 X** — 의도적 hang 재현 어려움. cycle 26 fix 의 cycle 27~32 정상 fire 검증과 동일 카테고리 = 정상 종료가 검증
- **PPID chain ancestor 매칭 X 시 fallback 의존** — 일반적 환경 (mcc 안) 에선 chain 안 본 메인 매칭 → fallback 도달 X. 특수 환경 (예: skill 발화가 별도 spawn 으로 chain 끊김) 에선 fallback 도달
- **`xargs basename` 환경 의존** — input 비어있을 때 stderr warning. case statement 가 빈 input 안전 처리

---

## 7. 결론

cycle 26 fix 의 다중 claude race 잠재성 해소. 본 도구 bash 의 PPID chain 안 본 메인 'claude' 정확 매칭 → watch.sh hang safety v2 의 정확도 보장.

cycle 33 N=50 시리즈 carry-over 마지막 fix. cycle 34+ expand-scope chain step 펼침의 보호망 안전.
