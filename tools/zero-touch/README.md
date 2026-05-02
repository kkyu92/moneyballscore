# develop-cycle Zero-Touch Watcher

`/develop-cycle N` 운영을 사용자 입력 0회로 무한 반복.

**Spec**: [`docs/superpowers/specs/2026-05-02-develop-cycle-zero-touch-design.md`](../../docs/superpowers/specs/2026-05-02-develop-cycle-zero-touch-design.md)
**Plan**: [`docs/superpowers/plans/2026-05-02-develop-cycle-zero-touch.md`](../../docs/superpowers/plans/2026-05-02-develop-cycle-zero-touch.md)

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
