# develop-cycle Zero-Touch 자동화 — Design Spec

**작성일**: 2026-05-02
**대상**: 본 메인 (kyusikkyu@gmail.com) iTerm2 직접 환경
**연관**: develop-cycle skill (글로벌 `~/.claude/skills/develop-cycle/SKILL.md`), R7 자동 머지 정책, handoff carry-over

---

## 1. 목적

`/develop-cycle N` 운영을 사용자 입력 0회로 무한 반복 가능하게 만든다. 컨텍스트 한계 때문에 N 사이클마다 사용자가 직접 `/clear` → `/handoff load` → `/develop-cycle N` 입력해야 하는 현재 의존성을 외부 timer + tmux send-keys 메커니즘으로 제거.

## 2. 사용자 결정 (확정)

- **Mode B 만 채택** — N 사이클 단위 자동 timer reset
- **Mode A (텔레그램 fallback) 드롭** — Mode B 가 작동하면 불필요
- **이슈 자동 triage 별도 spec** — 다음 세션
- **N 기본값 = 3** — 사용자 권장 (컨텍스트 50~70% 안전 마진)
- **트리거 = 메인 자가 신호** — race 0 보장. 외부 timer 가 idle 시점 추측하지 않음

## 3. 검증 결과 박제 (claude-code-guide 2회)

| 항목 | 결과 |
|---|---|
| LLM 자체 슬래시 명령 fork | ❌ 불가 (확정) |
| stdin 직접 주입 | ❌ 공식 경로 없음 |
| MCP server 세션 제어 | ❌ tool 노출만 |
| `--continue`/`--resume` | ❌ picker 인터랙션 필요 |
| headless `claude -p` 무한 루프 | ❌ multi-agent 워크플로 권한 대기 |
| watchdog 재시작 + SessionStart hook | ⚠️ `additionalContext` 는 컨텍스트 주입이지 명령 실행 X |
| **tmux send-keys** | **✅ 작동, 단 race 처리 필요** |
| 자동 compaction | ⚠️ N=50 drift 심함 |

→ **진짜 zero-touch (사용자 0회)** = 인정된 메커니즘은 tmux send-keys + 메인 자가 신호 조합만 유일.

## 4. 메커니즘

### 4.1 컴포넌트

| 컴포넌트 | 역할 | 위치 |
|---|---|---|
| **메인 (develop-cycle skill)** | 사이클 끝마다 signal file 작성 | 글로벌 SKILL.md (사용자 영역) |
| **launchd timer** | 5초 polling, watch script 실행 | `~/Library/LaunchAgents/com.kkyu.dc-watch.plist` |
| **watch script** | signal file read → tmux send-keys 시퀀스 | `~/.develop-cycle/watch.sh` |
| **tmux session** | 메인이 그 안에서 돌아가야 함 | session name = `claude` |

### 4.2 Signal File

**경로**: `~/.develop-cycle/signal`

**Format** (개행 구분):

```
<line 1> = "<n>"           — 방금 끝난 사이클 번호 (1, 2, 3...)
<line 2> = "OK" | "FAIL"   — 상태
<line 3> = (optional)      — FAIL 시 원인 (OK 인 경우 빈 줄)
<line 4> = "<next_n>"      — 다음 세션에 발화할 /develop-cycle N 값
                              (보통 = 사용자가 처음 호출한 N 동일.
                               메인이 이 값을 자가 결정. 0 이면 send-keys 안 함 = 정지)
```

**예시 1 (정상 + 무한 반복)**:
```
3
OK

3
```
→ Cycle 3 끝, 정상, 다음 세션에 `/develop-cycle 3` 발화 (3 사이클 묶음 무한 반복)

**예시 2 (정상 + 사용자가 stop 의도)**:
```
3
OK

0
```
→ Cycle 3 끝, 정상, 다음 세션 발화 안 함. 사용자가 직접 컴 켰을 때 깨끗한 fresh 컨텍스트만 carry-over 상태로 유지

**예시 3 (FAIL)**:
```
2
FAIL
worker shutdown timeout — TeamDelete 실패
0
```
→ Cycle 2 fail, send-keys 안 함, 텔레그램 알림 (4.5 참조). next_n 무시됨.

### 4.3 Watch Script (정상 케이스 시퀀스)

```bash
#!/bin/bash
SIGNAL=~/.develop-cycle/signal
LOCK=~/.develop-cycle/lock
LOG=~/.develop-cycle/watch.log

[ ! -f "$SIGNAL" ] && exit 0
[ -f "$LOCK" ] && exit 0
touch "$LOCK"

STATUS=$(sed -n '2p' "$SIGNAL")
NEXT_N=$(sed -n '4p' "$SIGNAL")

case "$STATUS" in
  OK)
    if [ "${NEXT_N:-0}" -gt 0 ] 2>/dev/null; then
      tmux send-keys -t claude "/clear" Enter
      sleep 3
      tmux send-keys -t claude "/handoff load" Enter
      sleep 8
      tmux send-keys -t claude "/develop-cycle $NEXT_N" Enter
      echo "$(date) fired cycle N=$NEXT_N" >> "$LOG"
    else
      echo "$(date) OK with next_n=0, stop" >> "$LOG"
    fi
    ;;
  FAIL)
    REASON=$(sed -n '3p' "$SIGNAL")
    curl -X POST "$TELEGRAM_WEBHOOK" -d "text=⚠️ develop-cycle FAIL: $REASON"
    echo "$(date) fail alert sent: $REASON" >> "$LOG"
    ;;
  *)
    echo "$(date) malformed signal, status=$STATUS — discarding" >> "$LOG"
    ;;
esac

rm -f "$SIGNAL" "$LOCK"
```

**중요**: `rm -f` 가 case 분기 밖. STATUS 가 OK/FAIL/손상 무엇이든 signal 항상 삭제 → 무한 루프 차단.

### 4.4 launchd plist (5초 polling)

`~/Library/LaunchAgents/com.kkyu.dc-watch.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.kkyu.dc-watch</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/kyusikkim/.develop-cycle/watch.sh</string>
  </array>
  <key>StartInterval</key><integer>5</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardErrorPath</key><string>/Users/kyusikkim/.develop-cycle/error.log</string>
</dict>
</plist>
```

`launchctl load ~/Library/LaunchAgents/com.kkyu.dc-watch.plist` 로 활성.

### 4.5 텔레그램 알림 (FAIL 케이스만)

기존 텔레그램 outbound 인프라 재활용 (`project_telegram_notification_structure.md`). 알림 양식:

```
⚠️ develop-cycle FAIL
Cycle: <n>
원인: <reason>
시간: <KST>
```

응답 받지 않음 (Mode A 드롭). 사용자가 컴 봤을 때 발견 → 직접 처리.

## 5. 케이스 처리

| 케이스 | 신호 상태 | timer 동작 | 사용자 인지 |
|---|---|---|---|
| **정상 사이클 N 끝** | "N\nOK\nN" | send-keys 시퀀스 → 다음 N 자동 | 즉시 X (운영 자연 진행) |
| **사이클 fail (CI red, shutdown 실패 등)** | "N\nFAIL\n<reason>" | 텔레그램 알림만 | 폰에서 알림 수신 |
| **메인 hang (API 장애 등)** | (파일 없음) | 안 움직임 | 컴 봤을 때 발견 (silent stuck) |
| **메인 crash (프로세스 죽음)** | (파일 없음) | 안 움직임 | 컴 봤을 때 발견 |
| **신호 작성 후 send-keys 전 사용자 끼어듦** | "N\nOK\nN" | 사용자 입력 buffer 다음에 send-keys 누적 | 화면에서 발견 |

## 6. 전제 조건 (구현 전 충족)

1. **tmux 채택** — 사용자가 평소 `claude` 띄우는 alias 변경
   ```bash
   alias mcc='tmux new -As claude claude'
   ```
   기존 iTerm2 그대로 사용. tmux status bar 한 줄 추가 외 시각적 변동 X.

2. **develop-cycle SKILL.md 갱신** — 사용자 영역 (`~/.claude/skills/develop-cycle/SKILL.md`). 사이클 끝 단계에 다음 추가:
   - 정상 끝: signal file 에 "N\nOK\n<remaining_n>" 작성
   - fail 끝: signal file 에 "N\nFAIL\n<reason>" 작성
   - handoff save 자동 호출은 기존 로직 유지

   본 메인이 직접 갱신 X (글로벌 skill 영역). 사용자가 별도 작업.

## 7. 안전장치

- **Lock file** (`~/.develop-cycle/lock`) — watch.sh 동시 실행 방지
- **Signal 삭제** — send-keys 후 즉시 삭제. 중복 fire 방지
- **tmux session 명시** (`-t claude`) — 다른 tmux 세션 격리
- **launchd ExitCode != 0 시 재진입 방지** — `error.log` 만 쌓이고 자동 disable 되지 않음 (수동 점검 의도)
- **신호 안 써지면 모든 게 stuck** — 의도된 default. 메인이 죽거나 skill 갱신 안 됐을 때 자동 작동 X 가 안전

## 8. 1주차 검증 항목 (운영 시작 후)

- [ ] send-keys 시퀀스 정확히 작동 (`/clear` → `/handoff load` → `/develop-cycle N`)
- [ ] 새 fresh 세션 첫 응답 처리 시간 — sleep 3/8 적절성
- [ ] signal file race — write 도중 read 발생 빈도
- [ ] tmux detach + launchd 동시 작동 — 노트북 닫고 외출 시
- [ ] handoff load 가 실제 잔여 N carry-over 정확히 적용 (사용자 영역 SKILL.md 수정 후)
- [ ] 사이클 fail 시 신호 작성 정확 (worker shutdown 실패 시뮬)
- [ ] hang timeout 알림 작동 (만들 경우 — 본 spec 에선 미포함)
- [ ] 권한 prompt 떠 있을 때 send-keys 동작 (자율 권한 정책 박제 가정)

## 9. 비포함 (의도)

- **Mode A (텔레그램 fallback 양방향)** — Mode B 가 작동하면 불필요. 단 일방향 outbound 알림 (FAIL 케이스) 은 4.5 에 포함
- **자동 hang detection / timeout 알림** — Phase 2. 1주차 운영 결과 보고 추가 결정
- **자동 retry / 자동 복구** — fail 시 알림만, 사용자 직접 처리. retry 로직이 또 다른 race 만들 위험
- **이슈 자동 triage** — 다음 세션 별도 spec
- **신호 file 외 추가 IPC (named pipe, socket 등)** — file polling 으로 충분, 단순성 우선

## 9.1 Stop 메커니즘

무한 반복은 **사용자 직접 끼어들기** 로 중단:

- 사용자가 컴 켜서 메인 세션에 어떤 입력이든 보내면 (또는 ESC) 메인이 사이클 진행 중단
- 메인이 진행 중인 사이클까지 끝낸 후 signal file 의 `<next_n>` 자리에 "0" 박제 → timer 가 send-keys 안 함 → 운영 자연 정지
- 별도 `~/.develop-cycle/stop` 파일을 만드는 메커니즘은 미포함 (Phase 2). 1주차 운영 후 필요성 재평가

## 10. 다음 단계

1. 본 spec 사용자 리뷰
2. 승인 시 `superpowers:writing-plans` skill 호출 → implementation plan
3. plan 승인 후 본 메인 작업 영역 구현 (watch.sh, plist, 디렉토리 셋업, FAIL 케이스 텔레그램 webhook 연결)
4. 사용자 작업 영역 (tmux alias + SKILL.md 갱신) 완료 후 첫 fire 테스트
5. 1주차 운영 + 검증 항목 점검
