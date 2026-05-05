# cycle 53 — FIRE_HANG capture-pane logging (cycle 48 fix v3 follow-up)

**작성**: 2026-05-05 KST
**Author**: 본 메인 (claude opus 4.7)
**Chain**: fix-incident
**Status**: PARTIAL (logging 보강 PR 박제. 진짜 fix 는 다음 FIRE_HANG 자연 발화 시 capture 결과 보고 결정)

## 배경

cycle 48 의 hang safety v3 (`FIRE_PENDING` placeholder + `check_timeout()` FIRE_HANG 감지)
가 silent gap (FIRE_PENDING marker 부재) 차단했고, cycle 49~52 fire 4회 PASS 박제로
silent gap 차단 결과 검증됨. 단 새 한계 발현:

| timestamp | 이전 fire | FIRE_HANG | gap | 회복 |
|---|---|---|---|---|
| 2026-05-05 08:01 | 23:12 N=35 | cycle=99 elapsed=400s | 8h | 08:04 OK with next_n=0 stop |
| 2026-05-05 18:53 | 18:48 N=19 | cycle=19 elapsed=305s | 5m | 19:00 N=18 정상 fire |

두 case 모두 `FIRE_PENDING` 박제 PASS (cycle 48 fix v3 작동) 후 새 claude 가
ACTIVE 파일 PID 자리 덮어쓰기 실패. 5~7분 동안 "새 claude 진단 단계 진입 못함" =
warm-up race 추정 (cycle 42.5 hotfix § 5 잔여 한계 3건 중 하나 발현).

## Root cause investigation 한계

`/investigate` Phase 1~3 따른 결과:

- **Phase 1 evidence**: watch.log entry 만. tmux pane 상태 X (새 claude prompt 받았나?
  /handoff load 처리 중인가? raw bash prompt 인가?)
- **Phase 2 pattern**: cycle 42.5 hotfix § 5 잔여 한계 3건 (C-d EOF / 12s warm-up / sleep 8 race) —
  어느 건 발현인지 결정 X
- **Phase 3 hypothesis**: warm-up race 가 가장 자연 (watch.log 라벨 자체 "warm-up race?").
  단 단일 fire 실측 X — sleep 시간 늘리는 추측 fix = cycle 42.5 hotfix 가짜 fix 패턴 재발 위험
  (R5 정정 박제 5건 누적)

**Iron Law 준수**: 본 cycle 53 = fix 추측 회피. logging 보강 (capture-pane 박제) 으로
다음 FIRE_HANG 자연 발화 시 evidence 결정적 확보 후 진짜 fix.

## 변경 사항

### `~/.develop-cycle/watch.sh` (사용자 영역 직접)

`check_timeout()` FIRE_HANG 감지 분기에 `tmux capture-pane` 로깅 추가:

```bash
if [ "$elapsed" -gt "$FIRE_HANG_THRESHOLD" ]; then
  log "FIRE_HANG cycle=$cycle_n elapsed=${elapsed}s — 새 claude 진단 단계 진입 못함 (warm-up race?)"
  # cycle 53 진단 logging — capture-pane 으로 새 claude 상태 박제 (root cause 결정용)
  local capture_socket capture_target capture_file
  capture_socket=$(cat "$DC_HOME/tmux-socket" 2>/dev/null)
  capture_target=$(cat "$DC_HOME/tmux-target" 2>/dev/null)
  [ -z "$capture_socket" ] && capture_socket="default"
  [ -z "$capture_target" ] && capture_target="claude"
  capture_file="$DC_HOME/fire-hang-$(date +%Y%m%d-%H%M%S)-cycle${cycle_n}.log"
  {
    echo "# FIRE_HANG capture cycle=$cycle_n elapsed=${elapsed}s socket=$capture_socket target=$capture_target"
    echo "# captured: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "## tmux list-sessions"
    if [ "$capture_socket" = "default" ]; then
      tmux list-sessions 2>&1
    else
      tmux -L "$capture_socket" list-sessions 2>&1
    fi
    echo "## tmux list-panes -t $capture_target"
    ... (pane_pid + pane_current_command)
    echo "## capture-pane (last 80 lines)"
    ... (tmux capture-pane -p -S -80)
  } > "$capture_file" 2>&1
  log "FIRE_HANG capture saved: $capture_file"
  notify_fail "FIRE HANG cycle $cycle_n: ${elapsed}s silent. capture: $capture_file. mcc 재진입 + /handoff load 권장."
  rm -f "$ACTIVE" "$IDLE_SINCE"
fi
```

### 박제 내용

각 FIRE_HANG 시 `~/.develop-cycle/fire-hang-<timestamp>-cycle<n>.log` 박제:

1. **tmux list-sessions** — claude 세션 살아있나
2. **list-panes pane_pid + pane_current_command** — pane 안 무엇이 돌고 있나 (claude / bash / cat / sleep / etc.)
3. **capture-pane -p -S -80** — 마지막 80 줄 화면 캡처

### 박제 결과 보고 가능한 root cause 결정

| capture 결과 | root cause | fix 방향 |
|---|---|---|
| 빈 화면 + bash prompt | claude spawn 실패 (caffeinate 또는 mcc alias 문제) | mcc alias / caffeinate 진단 |
| `claude --` 진행 중 + 출력 부재 | claude warm-up 12s+ 부족 | sleep 20 → 30 또는 40 늘림 |
| `/handoff load` output 멈춤 | /handoff load 자체 hang (memory dir scan / drift detection) | /handoff load 진단 보강 |
| `/develop-cycle N` output 부재 | sleep 8 race — develop-cycle 입력 누락 | sleep 8 → 12 늘림 |
| pane_current_command=`cat` 또는 `sleep` | C-d EOF 무시 (cycle 43 ABORT 대상 아닌 wrapped 진행 중) | bash wrapper 신호 처리 |

## 잔여 한계 (cycle 53 fix 차단 X)

- **fix 추측 회피** = warm-up race 자체 차단 X. 다음 FIRE_HANG 자연 발화 1+ case 까지
  대기. capture 결과 evidence 결정적 확보 후 진짜 fix
- **cycle 54+ 발화 시 R5 6번째 후보 검증**: capture-pane 결과 = warm-up race 명확하면 진짜 fix.
  명확 X 면 추가 logging
- **cycle 47 retro next_n=99 박제 의심**: case 1 cycle=99 라벨이 next_n=99 이라는 점이 흥미.
  cycle 47 retro 가 잔여 카운트 99 라고 박제 → watch.sh fire 99 → 새 claude N=99 입력 → hang.
  cycle 47 박제 자체 정확성 별도 검토 후보

## chain stop = PARTIAL

cycle 48 패턴 동일 outcome:

- PR 생성 + R7 squash 자동 머지 (logging 보강 박제)
- 실측 fire 1회 PASS 또는 사용자 자연 발화 검증 = 본 cycle 53 단독 X (fix 본질 X 라 검증 가치 X)
- 다음 cycle (54+) 의 첫 FIRE_HANG 자연 발화 시 capture 결과 보고 진짜 fix 박제

## R5 정정 박제 6번째 후보

| # | 사이클 | 거짓 박제 | 정정 시점 | 차단 fix |
|---|---|---|---|---|
| 1 | cycle 25/26 | "watch.sh fire 검증됐다" | cycle 33 | PPID chain |
| 2 | cycle 39+40 | "base PR 자동 fire 작동" | cycle 41 | fire 시퀀스 |
| 3 | cycle 41 | "fire 시퀀스 검증됐다" | cycle 42 first fire 21:42 | hotfix 진행 |
| 4 | cycle 42.5 hotfix | "smoke + SIGINT survival 통과" | cycle 42.5 22:06 second fire | (cycle 43 본 fix) |
| 5 | cycle 42.5 ensure_session | "session 검증 충분" | cycle 43 본 진단 | pane wrapper 검증 |
| **6 후보** | **cycle 48 fix v3** | **"FIRE_PENDING + check_timeout 충분"** | **cycle 53 본 진단** | **(다음 발화 시 결정)** |

cycle 48 fix v3 가 silent gap 차단 PASS 했으나 warm-up race 차단 X. **R5 정정 6번째**
박제 가능 — 단 cycle 53 본 fix 가 진짜 차단 fix X (logging 만) 라 6번째 정식 박제는
다음 fix-incident chain 의 진짜 차단 fix PR 머지 시점에 박제.

## 관련 박제

- cycle 48 spec: `docs/superpowers/specs/2026-05-05-cycle-48-fire-hang-detection.md`
- cycle 42.5 hotfix § 5 잔여 한계 3건: C-d EOF / 12s warm-up / sleep 8 race
- cycle 43 spec: pane wrapper 검증 (cycle 42.5 hotfix follow-up)
