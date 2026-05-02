# develop-cycle Zero-Touch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/develop-cycle N` 운영을 사용자 입력 0회로 무한 반복 가능하게 만든다. 본 메인 작업 영역 (watch.sh + plist + install.sh + README) 만 다룬다.

**Architecture:** launchd 5초 polling → `~/.develop-cycle/signal` 파일 read → 정상 (OK + next_n>0) 이면 tmux send-keys 시퀀스 (`/clear` → `/handoff load` → `/develop-cycle N`), FAIL 이면 텔레그램 알림. 메인 자가 신호로 race 0.

**Tech Stack:** bash, launchd (macOS), tmux send-keys, curl (텔레그램 webhook)

**Spec:** `docs/superpowers/specs/2026-05-02-develop-cycle-zero-touch-design.md`

**비포함** (사용자 영역, 본 plan task X):
- tmux alias 추가 (`alias mcc='tmux new -As claude claude'`)
- 글로벌 `~/.claude/skills/develop-cycle/SKILL.md` 갱신 (signal file 작성 로직)
- 본 plan 의 README 가 둘 다 가이드만 박제

---

### Task 1: 디렉토리 셋업

**Files:**
- Create: `tools/zero-touch/.gitkeep`

- [ ] **Step 1: 디렉토리 + .gitkeep 생성**

```bash
mkdir -p tools/zero-touch
touch tools/zero-touch/.gitkeep
```

- [ ] **Step 2: 확인**

Run: `ls -la tools/zero-touch/`
Expected: `.gitkeep` 1개

- [ ] **Step 3: Commit**

```bash
git add tools/zero-touch/.gitkeep
git commit -m "chore(zero-touch): tools/zero-touch/ 디렉토리 셋업"
```

---

### Task 2: watch.sh 작성 (DRY_RUN mode 포함)

**Files:**
- Create: `tools/zero-touch/watch.sh`

watch.sh 는 launchd 가 5초마다 실행. signal file 있으면 read → 분기 → send-keys 또는 텔레그램 → signal 삭제. `DRY_RUN=1` 환경변수면 send-keys / curl 을 echo 로 mock (Task 3 의 테스트가 사용).

- [ ] **Step 1: watch.sh 작성**

`tools/zero-touch/watch.sh` 전체 내용:

```bash
#!/bin/bash
# develop-cycle zero-touch watcher
# Read signal file → fire tmux send-keys to claude session, or telegram alert on FAIL.

set -uo pipefail

DC_HOME="${DC_HOME:-$HOME/.develop-cycle}"
SIGNAL="$DC_HOME/signal"
LOCK="$DC_HOME/lock"
LOG="$DC_HOME/watch.log"
TMUX_TARGET="${TMUX_TARGET:-claude}"
DRY_RUN="${DRY_RUN:-0}"
TELEGRAM_WEBHOOK="${TELEGRAM_WEBHOOK:-}"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"
}

send() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY_RUN send: $*"
  else
    tmux send-keys -t "$TMUX_TARGET" "$@"
  fi
}

notify_fail() {
  local reason="$1"
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY_RUN notify: $reason"
  elif [ -n "$TELEGRAM_WEBHOOK" ]; then
    curl -s -X POST "$TELEGRAM_WEBHOOK" \
      --data-urlencode "text=⚠️ develop-cycle FAIL: $reason" >/dev/null
  fi
}

main() {
  [ ! -f "$SIGNAL" ] && return 0
  [ -f "$LOCK" ] && return 0
  touch "$LOCK"

  local status reason next_n
  status=$(sed -n '2p' "$SIGNAL")
  reason=$(sed -n '3p' "$SIGNAL")
  next_n=$(sed -n '4p' "$SIGNAL")

  case "$status" in
    OK)
      if [[ "$next_n" =~ ^[0-9]+$ ]] && [ "$next_n" -gt 0 ]; then
        send "/clear" Enter
        sleep 3
        send "/handoff load" Enter
        sleep 8
        send "/develop-cycle $next_n" Enter
        log "fired cycle N=$next_n"
      else
        log "OK with next_n='$next_n', stop"
      fi
      ;;
    FAIL)
      notify_fail "$reason"
      log "fail alert sent: $reason"
      ;;
    *)
      log "malformed signal, status='$status' — discarding"
      ;;
  esac

  rm -f "$SIGNAL" "$LOCK"
}

main "$@"
```

- [ ] **Step 2: 실행권한 부여**

```bash
chmod +x tools/zero-touch/watch.sh
```

- [ ] **Step 3: bash 문법 검증**

Run: `bash -n tools/zero-touch/watch.sh && echo OK`
Expected: `OK` (구문 에러 없음)

- [ ] **Step 4: Commit**

```bash
git add tools/zero-touch/watch.sh
git commit -m "feat(zero-touch): watch.sh — signal file → tmux send-keys / 텔레그램 알림"
```

---

### Task 3: watch.sh 단위 테스트 (4 시나리오)

**Files:**
- Create: `tools/zero-touch/test-watch.sh`

DRY_RUN=1 로 watch.sh 호출 + signal 파일 시뮬 → 출력/log assertion.

- [ ] **Step 1: test-watch.sh 작성**

`tools/zero-touch/test-watch.sh` 전체 내용:

```bash
#!/bin/bash
# Self-test for watch.sh (DRY_RUN mode).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WATCH="$SCRIPT_DIR/watch.sh"

TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

export DC_HOME="$TMP"
export DRY_RUN=1
export TELEGRAM_WEBHOOK="https://example.invalid/dummy"

assert_contains() {
  local out="$1" needle="$2" name="$3"
  if echo "$out" | grep -qF "$needle"; then
    echo "✅ $name"
  else
    echo "❌ $name"
    echo "  expected to contain: $needle"
    echo "  actual: $out"
    exit 1
  fi
}

assert_not_contains() {
  local out="$1" needle="$2" name="$3"
  if echo "$out" | grep -qF "$needle"; then
    echo "❌ $name"
    echo "  expected NOT to contain: $needle"
    echo "  actual: $out"
    exit 1
  else
    echo "✅ $name"
  fi
}

run_case() {
  local name="$1" signal_content="$2"
  rm -f "$TMP/signal" "$TMP/lock"
  printf "%s" "$signal_content" > "$TMP/signal"
  bash "$WATCH" 2>&1
}

# Case 1: OK + next_n=3 → send-keys 시퀀스
out=$(run_case "ok+next3" "3
OK

3")
assert_contains "$out" "DRY_RUN send: /clear" "case1: /clear send"
assert_contains "$out" "DRY_RUN send: /handoff load" "case1: /handoff load send"
assert_contains "$out" "DRY_RUN send: /develop-cycle 3" "case1: /develop-cycle 3 send"

# Case 2: OK + next_n=0 → send-keys 안 함
out=$(run_case "ok+next0" "3
OK

0")
assert_not_contains "$out" "DRY_RUN send" "case2: no send-keys"

# Case 3: FAIL → 텔레그램 notify
out=$(run_case "fail" "2
FAIL
worker shutdown timeout
0")
assert_contains "$out" "DRY_RUN notify: worker shutdown timeout" "case3: telegram notify"
assert_not_contains "$out" "DRY_RUN send" "case3: no send-keys"

# Case 4: malformed → 아무것도 안 함, log 만
out=$(run_case "malformed" "1
WEIRD_STATUS
")
assert_not_contains "$out" "DRY_RUN send" "case4: no send-keys"
assert_not_contains "$out" "DRY_RUN notify" "case4: no notify"
grep -qF "malformed signal" "$TMP/watch.log" && echo "✅ case4: log written" \
  || { echo "❌ case4: log missing"; exit 1; }

# Case 5: signal file 없음 → no-op (lock 파일도 안 만들어야)
rm -f "$TMP/signal" "$TMP/lock"
bash "$WATCH"
[ ! -f "$TMP/lock" ] && echo "✅ case5: no signal → no lock" \
  || { echo "❌ case5: lock created without signal"; exit 1; }

# Case 6: signal 처리 후 항상 삭제
printf "3\nOK\n\n3" > "$TMP/signal"
bash "$WATCH" >/dev/null 2>&1
[ ! -f "$TMP/signal" ] && echo "✅ case6: signal deleted after processing" \
  || { echo "❌ case6: signal NOT deleted"; exit 1; }

echo ""
echo "All tests passed."
```

- [ ] **Step 2: 실행권한 부여**

```bash
chmod +x tools/zero-touch/test-watch.sh
```

- [ ] **Step 3: 테스트 실행 — fail 확인 (현재 watch.sh 그대로면 다 통과해야 함)**

Run: `tools/zero-touch/test-watch.sh`
Expected: 모든 case 가 `✅`, 마지막에 `All tests passed.`

만약 ❌ 가 나오면 Task 2 의 watch.sh 코드 재검토. 보통 `sed -n` 라인 번호 또는 `next_n` 정수 검증 부분이 의심.

- [ ] **Step 4: Commit**

```bash
git add tools/zero-touch/test-watch.sh
git commit -m "test(zero-touch): watch.sh DRY_RUN 6 시나리오 자가검증"
```

---

### Task 4: launchd plist template 작성

**Files:**
- Create: `tools/zero-touch/com.kkyu.dc-watch.plist`

placeholder 3개: `__DC_WATCH_PATH__` / `__TELEGRAM_WEBHOOK__` / `__DC_HOME__`. install.sh 가 sed 로 치환.

- [ ] **Step 1: plist 작성**

`tools/zero-touch/com.kkyu.dc-watch.plist` 전체:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.kkyu.dc-watch</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>__DC_WATCH_PATH__</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>TELEGRAM_WEBHOOK</key><string>__TELEGRAM_WEBHOOK__</string>
    <key>TMUX_TARGET</key><string>claude</string>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>StartInterval</key><integer>5</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardErrorPath</key><string>__DC_HOME__/error.log</string>
  <key>StandardOutPath</key><string>__DC_HOME__/stdout.log</string>
</dict>
</plist>
```

- [ ] **Step 2: plist 문법 검증 (placeholder 그대로면 plutil 도 통과해야 함 — 형식만 검증)**

Run: `plutil -lint tools/zero-touch/com.kkyu.dc-watch.plist`
Expected: `tools/zero-touch/com.kkyu.dc-watch.plist: OK`

- [ ] **Step 3: Commit**

```bash
git add tools/zero-touch/com.kkyu.dc-watch.plist
git commit -m "feat(zero-touch): launchd plist template — 5초 polling + tmux 환경변수"
```

---

### Task 5: install.sh 작성

**Files:**
- Create: `tools/zero-touch/install.sh`

`~/.develop-cycle/` 디렉토리 셋업 + watch.sh 복사 + plist 치환 후 `~/Library/LaunchAgents/` 배치 + `launchctl load`.

- [ ] **Step 1: install.sh 작성**

`tools/zero-touch/install.sh` 전체:

```bash
#!/bin/bash
# Install develop-cycle zero-touch watcher.
# Sets up ~/.develop-cycle/ + LaunchAgent plist + launchctl load.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_SRC="$REPO_ROOT/tools/zero-touch/watch.sh"
PLIST_SRC="$REPO_ROOT/tools/zero-touch/com.kkyu.dc-watch.plist"

DC_HOME="$HOME/.develop-cycle"
PLIST_DEST="$HOME/Library/LaunchAgents/com.kkyu.dc-watch.plist"
DRY_RUN="${DRY_RUN:-0}"

if [ -z "${TELEGRAM_WEBHOOK:-}" ]; then
  echo "WARN: TELEGRAM_WEBHOOK env var 미설정. FAIL 알림이 silent 작동 (curl 호출 자체 skip)."
  echo "   계속하려면 TELEGRAM_WEBHOOK 설정 후 재실행 권장."
  read -rp "Continue without webhook? [y/N] " ans
  [ "$ans" = "y" ] || exit 1
fi

run() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY: $*"
  else
    eval "$@"
  fi
}

echo "→ ~/.develop-cycle/ 셋업"
run "mkdir -p '$DC_HOME'"
run "cp '$SCRIPT_SRC' '$DC_HOME/watch.sh'"
run "chmod +x '$DC_HOME/watch.sh'"

echo "→ plist 치환 + 배치"
run "mkdir -p '$HOME/Library/LaunchAgents'"
if [ "$DRY_RUN" = "1" ]; then
  echo "DRY: sed -e ... '$PLIST_SRC' > '$PLIST_DEST'"
else
  sed \
    -e "s|__DC_WATCH_PATH__|$DC_HOME/watch.sh|g" \
    -e "s|__TELEGRAM_WEBHOOK__|${TELEGRAM_WEBHOOK:-}|g" \
    -e "s|__DC_HOME__|$DC_HOME|g" \
    "$PLIST_SRC" > "$PLIST_DEST"
fi

echo "→ launchctl load"
run "launchctl unload '$PLIST_DEST' 2>/dev/null || true"
run "launchctl load '$PLIST_DEST'"

echo ""
echo "✅ Installed."
echo "   - watch.sh: $DC_HOME/watch.sh"
echo "   - plist: $PLIST_DEST"
echo "   - log: $DC_HOME/watch.log"
echo "   - error log: $DC_HOME/error.log"
echo ""
echo "확인: launchctl list | grep dc-watch"
```

- [ ] **Step 2: 실행권한 부여**

```bash
chmod +x tools/zero-touch/install.sh
```

- [ ] **Step 3: bash 문법 검증**

Run: `bash -n tools/zero-touch/install.sh && echo OK`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add tools/zero-touch/install.sh
git commit -m "feat(zero-touch): install.sh — ~/.develop-cycle 셋업 + plist 치환 + launchctl load"
```

---

### Task 6: install.sh DRY_RUN 검증

실제 launchctl 호출 X, sed 치환 결과만 검증.

- [ ] **Step 1: DRY_RUN 으로 install.sh 호출**

```bash
TELEGRAM_WEBHOOK=https://example.invalid/dummy DRY_RUN=1 tools/zero-touch/install.sh <<< "y"
```

Expected output 에 `DRY: mkdir`, `DRY: cp`, `DRY: launchctl load` 등 보여야 함. 실제 파일은 안 만들어져야 함.

- [ ] **Step 2: 실제 파일 안 만들어졌는지 확인**

Run: `ls ~/.develop-cycle/ 2>&1 | head -5`
Expected: `No such file or directory` (DRY_RUN 이라 안 만들어졌음)

만약 이미 존재하면 (이전에 실 install.sh 돌린 경우) 무시 OK.

---

### Task 7: README + 운영 매뉴얼 작성

**Files:**
- Create: `tools/zero-touch/README.md`

설치 / 사용 / 트러블슈팅 / FAIL 알림 / stop / 사용자 영역 가이드 (tmux + SKILL.md) 모두 포함.

- [ ] **Step 1: README 작성**

`tools/zero-touch/README.md` 전체:

````markdown
# develop-cycle Zero-Touch Watcher

`/develop-cycle N` 운영을 사용자 입력 0회로 무한 반복.

**Spec**: [`docs/superpowers/specs/2026-05-02-develop-cycle-zero-touch-design.md`](../../docs/superpowers/specs/2026-05-02-develop-cycle-zero-touch-design.md)

## 메커니즘

```
[메인 (tmux 안 claude)] ── 사이클 끝 ──> ~/.develop-cycle/signal 작성
                                              │
                                              ▼
[launchd 5초 polling] ── watch.sh 실행 ── signal read
                                              │
        ┌─────────────────────────────────────┤
        │ OK + next_n>0                       │ FAIL
        ▼                                     ▼
  tmux send-keys                        텔레그램 알림
  /clear → /handoff load → /develop-cycle N
```

## 전제 조건 (사용자 영역)

본 watcher 만 install 한다고 작동 X. 두 가지 사용자 영역 작업 필수:

### 1. tmux 채택

평소 `claude` 띄울 때 tmux session 안에서 띄우도록:

```bash
# ~/.zshrc 또는 ~/.bash_profile
alias mcc='tmux new -As claude claude'
```

이후 `mcc` 로 띄우면 tmux session name = `claude`. iTerm2 그대로 사용. status bar 한 줄 추가 외 시각적 변동 X.

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

## 설치

```bash
# 텔레그램 알림 받을 webhook URL 환경변수로 export 후 실행
export TELEGRAM_WEBHOOK='https://your-cloudflare-worker.workers.dev/webhook'
tools/zero-touch/install.sh
```

확인:

```bash
launchctl list | grep dc-watch
# → com.kkyu.dc-watch  -  ...
```

## 사용

1. `mcc` 로 tmux session 안 claude 띄움 (또는 직접 `tmux new -s claude claude`)
2. `/develop-cycle 3` 호출
3. 사이클 끝나면 메인이 signal file 작성 → watcher 가 5초 내 발견 → `/clear` → `/handoff load` → `/develop-cycle 3` 자동 send-keys
4. 무한 반복

## 정지

사용자가 컴 켜서 메인 세션에 어떤 입력 (예: ESC 또는 "stop") 보내면 메인이 다음 사이클 진행 X. 또는 메인이 마지막 signal 의 `next_n` 자리에 `0` 박제하면 watcher 가 send-keys 안 함.

긴급 정지 (모든 자동화 중단):

```bash
launchctl unload ~/Library/LaunchAgents/com.kkyu.dc-watch.plist
```

## 로그

| 파일 | 내용 |
|---|---|
| `~/.develop-cycle/watch.log` | watcher 작동 로그 (fired, fail alert, malformed) |
| `~/.develop-cycle/error.log` | launchd stderr (스크립트 에러) |
| `~/.develop-cycle/stdout.log` | launchd stdout (보통 비어있음) |

```bash
tail -f ~/.develop-cycle/watch.log
```

## 트러블슈팅

### 사이클 끝났는데 watcher 가 안 움직임

1. signal file 작성됐는지 확인: `ls -la ~/.develop-cycle/`
   - 없으면 → SKILL.md 갱신 누락. 글로벌 skill 갱신 확인
2. launchd 동작 확인: `launchctl list | grep dc-watch`
   - 없으면 → `launchctl load ~/Library/LaunchAgents/com.kkyu.dc-watch.plist`
3. error.log 확인: `cat ~/.develop-cycle/error.log`

### send-keys 가 다른 tmux 세션에 가버림

`TMUX_TARGET` 환경변수 (plist 안) 가 `claude` 인지 확인. 다른 이름으로 tmux 띄우면 plist 수정 + reload 필요.

### 텔레그램 FAIL 알림 안 옴

1. `TELEGRAM_WEBHOOK` 환경변수 (plist 안) 정확한지 확인
2. `tools/zero-touch/install.sh` 재실행 시 webhook 환경변수 export 후

### sleep 3/8 타이밍 안 맞음

`/handoff load` 가 carry-over 못 읽고 `/develop-cycle` 발화되는 경우 sleep 늘리기. watch.sh 의 `sleep 3` / `sleep 8` 값 조정 후 `~/.develop-cycle/watch.sh` 재배치 (또는 `tools/zero-touch/install.sh` 재실행).

## DRY_RUN 자가 테스트

`tools/zero-touch/test-watch.sh` 가 6 시나리오 검증. install 전 / 변경 후 항상:

```bash
tools/zero-touch/test-watch.sh
```

## 비포함 (의도)

- Mode A 텔레그램 fallback 양방향 — 일방향 outbound (FAIL) 만
- 자동 hang detection / timeout 알림 — Phase 2
- 자동 retry / 자동 복구 — fail 시 알림만
- 별도 stop 파일 — 무한 반복 멈추려면 메인이 `next_n=0` 박제
````

- [ ] **Step 2: README 가독성 검증**

Run: `cat tools/zero-touch/README.md | head -60`
Expected: 메커니즘 다이어그램 + 전제 조건 섹션 보여야 함

- [ ] **Step 3: Commit**

```bash
git add tools/zero-touch/README.md
git commit -m "docs(zero-touch): README — 설치/사용/트러블슈팅 + 사용자 영역 가이드"
```

---

### Task 8: 통합 테스트 시뮬 가이드 (수동, 1회)

**Files:** (없음 — README 안 가이드)

본 task 는 plan 실행자가 install 후 1회 manual 검증. plan task 자체엔 step 만 박아두고 실제 실행은 사용자 영역 (tmux 셋업 + SKILL.md 갱신 후) 에서.

- [ ] **Step 1: README "사용" 섹션의 manual 검증 절차 실행**

본 메인 (plan 실행자) 이 직접 시뮬:

```bash
# 1. tmux session 띄움
tmux new -s claude

# 2. 다른 terminal 에서 signal 파일 직접 작성 (메인 자가 신호 시뮬)
mkdir -p ~/.develop-cycle
printf "1\nOK\n\n3" > ~/.develop-cycle/signal

# 3. 5초 대기 후 watch.log 확인
sleep 7
cat ~/.develop-cycle/watch.log
# → "fired cycle N=3" 보여야 함

# 4. tmux session 안에 어떤 키가 입력됐는지 시각 확인
tmux attach -t claude
# → /clear, /handoff load, /develop-cycle 3 가 입력된 흔적 보여야 함
```

- [ ] **Step 2: 결과 보고**

이 단계까진 본 plan 실행자 (subagent 또는 메인) 가 자율로 진행 가능. 단 실제 `/develop-cycle` 발화는 사용자 영역 SKILL.md 갱신 후라야 의미 있음 — manual 검증은 "시퀀스가 갔는지" 까지만.

---

### Task 9: TODOS.md 업데이트

**Files:**
- Modify: `TODOS.md`

본 plan 후속 carry-over 항목 추가 — 사용자 영역 (tmux alias + SKILL.md) 작업 박제.

- [ ] **Step 1: TODOS.md 의 적절한 섹션 (예: "Next-Up" 또는 신규 섹션) 에 추가**

```markdown
### ⭐ develop-cycle zero-touch — 사용자 영역 후속 작업 (2026-05-02 spec/plan 완료 후)

본 plan 구현 (`tools/zero-touch/`) + install 완료 후 작동하려면 사용자 영역 두 가지 필수:

- [ ] **tmux alias 추가** — `~/.zshrc` 에 `alias mcc='tmux new -As claude claude'`. 평소 `mcc` 로 claude 띄우기
- [ ] **글로벌 SKILL.md 갱신** — `~/.claude/skills/develop-cycle/SKILL.md` 의 사이클 끝 단계에 signal file 작성 로직 추가 (정상: "N\nOK\n\n<next_n>" / fail: "N\nFAIL\n<reason>\n0"). README `tools/zero-touch/README.md` 의 "전제 조건" 섹션 코드 블록 그대로 박제
- [ ] **TELEGRAM_WEBHOOK 환경변수 결정** — 기존 텔레그램 outbound 인프라 webhook URL 사용. install.sh 재실행 시 export
- [ ] **첫 fire 검증** — tmux 안에서 `/develop-cycle 3` 호출 → 1 사이클 끝 → watcher 가 자동 reset → 다음 N=3 자동 시작 확인. 1주차 fine-tune (sleep 타이밍 등)

박제 위치 후보: 본 plan 의 Task 9 가 이 섹션 추가 책임.
```

- [ ] **Step 2: Commit**

```bash
git add TODOS.md
git commit -m "docs(todos): zero-touch 사용자 영역 후속 작업 박제 (tmux alias + SKILL.md 갱신)"
```

---

## Self-Review

**1. Spec coverage**:
- Section 4.1 컴포넌트 (메인/launchd/watch.sh/tmux) → Task 2/4/5 ✅
- Section 4.2 signal file format → Task 2 watch.sh + Task 3 test-watch.sh ✅
- Section 4.3 watch.sh — case 분기 + rm -f → Task 2 ✅
- Section 4.4 plist (5초 polling) → Task 4 ✅
- Section 4.5 텔레그램 알림 (FAIL 만) → Task 2 notify_fail() + Task 7 README ✅
- Section 5 케이스 처리 (5종) → Task 3 test 4 시나리오 + Task 7 README 트러블슈팅 ✅
- Section 6 전제 조건 (tmux + SKILL.md) → Task 7 README + Task 9 TODOS ✅
- Section 7 안전장치 (lock + 삭제 + tmux 격리 + ExitCode + silent default) → Task 2 watch.sh + Task 4 plist ✅
- Section 8 1주차 검증 항목 → Task 7 README 트러블슈팅 + Task 9 첫 fire 검증 ✅
- Section 9 비포함 → Task 7 README 비포함 섹션 ✅
- Section 9.1 stop 메커니즘 → Task 7 README "정지" 섹션 ✅

**2. Placeholder scan**: 모든 step 에 actual 코드 박제. TBD/TODO 0건. "appropriate error handling" 0건. ✅

**3. Type consistency**:
- `TELEGRAM_WEBHOOK` (env var) — Task 2/4/5/7 모두 동일 이름 ✅
- `TMUX_TARGET` (env var) — Task 2/4/7 모두 동일 ✅
- `DC_HOME` (env var) — Task 2/3/5/7 모두 동일 ✅
- `~/.develop-cycle/signal` 경로 — 전 task 동일 ✅
- `next_n` (signal line 4) — Task 2/3/7 동일 ✅
- watch.sh `case OK | FAIL | *)` 분기 — test 4 시나리오 모두 커버 ✅

이상 없음.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-02-develop-cycle-zero-touch.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — 본 메인이 task 별 subagent 디스패치 + 리뷰. 독립 task 9개라 적합.

**2. Inline Execution** — 본 세션에서 task 순차 실행. 짧은 plan (~30분 작업) 이라 inline 도 무리 없음.

어느 쪽?
