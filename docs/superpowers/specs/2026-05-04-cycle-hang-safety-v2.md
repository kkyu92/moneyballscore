# cycle hang safety v2 — hybrid timeout (CPU/child probe + idle accumulator + hard cap)

**Date**: 2026-05-04
**PR**: `fix(dc-watch): cycle hang safety v2`
**Branch**: `fix/dc-watch-timeout`
**Driver**: cycle 24 hang (1h13m idle, 강제 종료 + 수동 cycles/24.json 박제)
**SKILL.md 마이그레이션**: 실패 모드 표 line 326 + 사이클 단계 1 진단 첫 step + 사이클 단계 4 회고 + 호환성 line 336 갱신

## 1. cycle 24 사례 회고

| 항목 | 값 |
|---|---|
| spawn | 2026-05-04 12:18 KST (PID 95089) |
| watch.log fired entry | 12:19:09 `fired fresh process cycle N=44` |
| 마지막 정상 cycle | 23 (12:09 → 12:18, 9분) |
| 사용자 polling 감지 | 13:32 (Churned for 43s + 빈 prompt) |
| 사용자 강제 종료 | 13:33 (launchctl unload + PID 95089 SIGTERM) |
| 1h13m hung | cycle_state JSON 미박제 / signal 미박제 / chain_selected unknown |
| 정상 평균 | 9분 (cycle 18 23분이 최장 정상) |

직전 cycle 21~23 = explore-idea (lite) → review-code (lite) → 모두 ≤ 10분. cycle 22/23 retro next_recommended = "큰 작업 H2 rolling stats backtest". cycle 24 가 큰 작업 chain (office-hours / plan-ceo-review / plan-eng-review 시퀀스) 시작했을 가능성 높음 — 이 chain 들 = AskUserQuestion 다수 사용 = 사용자 응답 대기 = hang.

## 2. root cause 가설

### 가설 (a) — AskUserQuestion 무한 대기 (유력)

`~/.claude/settings.json` 의 `defaultMode: bypassPermissions` 는 도구 권한 자동 승인 = 일반 Bash/Edit 등 prompt skip. 그러나 **AskUserQuestion 은 application logic** = 사용자 결정 요청 도구 = bypass 와 무관. tmux 안 spawn 된 claude session 이 사용자 응답 대기 시 응답할 사용자 X = 무한 대기.

직전 21~23 cycle (lite) = AskUserQuestion 호출 안 함 = 정상. cycle 24 가 큰 작업 chain 진입 → 첫 AskUserQuestion → hang.

### 대체 가설 (b)~(d) — 보강

| 가설 | 가능성 | 안전장치 커버 |
|---|---|---|
| (b) gh CLI / network hang | 낮음 (직전 cycle 동일 환경 정상) | 활동 측정 = network 도중엔 child process 활성 = 살림. timeout 도달 → hang 으로 인식 → kill |
| (c) chain 자체 무한 루프 | 낮음 (코드 path 변경 X) | hard cap = kill |
| (d) /handoff load 5점검 hang | 낮음 (직전 cycle 동일 명령 통과) | timeout 동일 커버 |

**핵심**: 가설 정확도와 무관하게 hybrid timeout = (a)~(d) 모두 커버. 가설 (a) 의 정확도는 다음 큰 작업 chain fire 시 재현 → lesson 박제로 검증.

## 3. 안전장치 설계 (v2 hybrid)

### 사용자 결정 (D1~D3)

- **D1**: 가설 확정 + 안전장치로 진행 (재현 검증 다음 fire 시점에 위임)
- **D2**: timeout 임계 = 45m soft (정상 9m 의 5×, 큰 작업 보장)
- **D3**: hybrid 설계 = soft 45m + hard 60m + idle 5m 누적 (활동 중 큰 작업 살림)

### active-cycle 파일 protocol

```
~/.develop-cycle/active-cycle
  line 1: cycle_n
  line 2: pid (메인 사이클 process)
  line 3: started_at (unix timestamp)
```

작성: SKILL.md 사이클 단계 1 진단 첫 step
삭제: SKILL.md 사이클 단계 4 회고, signal 작성 직전

### watch.sh check_timeout() 로직

```
매 5s fire:
  1. active-cycle 부재 → return (정상 idle)
  2. cycle_n / pid / started_at 파싱. malformed → discard + clean
  3. PID dead → cycle 자연 종료 (or main session crash). active-cycle clean
  4. idle-since 가 다른 cycle 의 것 → reset
  5. 활동 측정: cpu_tenths = ps -p $pid -o %cpu * 10
                 children = pgrep -P $pid | wc -l
  6. elapsed > CYCLE_HARD (3600s) → 무조건 do_kill (hard cap, 활동 무관 안전망)
  7. elapsed ≤ CYCLE_SOFT (2700s) → idle-since clean + return (정상 작업 영역)
  8. elapsed > soft + (cpu ≥ 1% OR children > 0) → 살림 + idle-since clean (활동 중)
  9. elapsed > soft + idle 첫 감지 → idle-since 작성 + return (1 sample, 더 보기)
  10. elapsed > soft + idle 누적 ≥ IDLE_THRESHOLD (300s) → do_kill (확정 hang)
```

### do_kill 동작

1. SIGTERM → sleep 5 → SIGKILL
2. `cycles/<n>.json` 작성 — outcome=interrupted + diagnostic (elapsed / cpu_tenths / children / threshold + reason)
3. signal FAIL + reason + next_n=0 (transient — main() 같은 fire 안에서 consume + cleanup)
4. active-cycle / idle-since 삭제
5. `notify_fail` (TELEGRAM_WEBHOOK 비어있으면 silent) + watch.log `TIMEOUT_KILL` entry

### 환경변수 + default

| 변수 | default | 의미 |
|---|---|---|
| `CYCLE_SOFT` | 2700 (45m) | 검사 시작 임계 |
| `CYCLE_HARD` | 3600 (60m) | 활동 무관 강제 kill |
| `IDLE_THRESHOLD` | 300 (5m) | idle 누적 = 확정 hang |
| `CPU_IDLE_TENTHS` | 10 (1.0%) | CPU% × 10 미만 = idle |
| `TELEGRAM_WEBHOOK` | empty | 비어있으면 notify silent |

## 4. regression test (`tests/scripts/dc-watch-timeout.test.sh`)

DRY_RUN=1 + 별도 DC_HOME (mktemp -d) 환경. 4 시나리오:

1. **hard cap kill**: dummy `sleep 9999` PID + active-cycle (started_at = now - 3700s). watch.sh 실행 → SIGTERM/SIGKILL + cycles/99.json (outcome=interrupted, reason="hard cap") + watch.log TIMEOUT_KILL + active-cycle/idle-since cleanup
2. **below soft**: started_at = now - 600s → kill 안 함 + cycle_state 미작성 + active-cycle 유지
3. **dead PID**: PID 99999 (검색해서 dead 확인) + active-cycle stale → active-cycle clean + cycle_state 미작성
4. **malformed active-cycle**: garbage 내용 → discard + active-cycle clean

실행 결과: 4/4 PASS.

```bash
$ bash tests/scripts/dc-watch-timeout.test.sh
PASS [hard cap]
PASS [below soft]
PASS [dead pid]
PASS [malformed]
ALL TESTS PASSED — dc-watch-timeout v2
```

## 5. 변경 박제

| 파일 | 변경 |
|---|---|
| `~/.develop-cycle/watch.sh` | 75줄 → 261줄. `check_timeout()` 신규 + `probe_activity()` + `do_kill()` + `write_started_iso()`. 기존 main signal 처리 변경 X (`check_timeout` 만 main() 첫 step 호출 추가) |
| `~/.claude/skills/develop-cycle/SKILL.md` | 단계 1 진단 첫 step active-cycle 작성 + 단계 4 회고 끝 active-cycle 삭제 + 실패 모드 line 326 hybrid 설명 + 호환성 line 336 watch.sh 변경 명시 |
| `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` | 글로벌 SKILL.md lockstep 동기 (cp 동일) |
| `docs/superpowers/specs/2026-05-04-cycle-hang-safety-v2.md` | 본 spec |
| `tests/scripts/dc-watch-timeout.test.sh` | regression test |

watch.sh 자체는 글로벌 (`~/.develop-cycle/`) 에 위치 = repo 안 사본 X. 변경 검증 = 본 spec 의 §3-§4 + regression test.

## 6. 후속 작업 (carry-over)

- [ ] 다음 큰 작업 chain (cycle 25+ 의 H2 rolling stats backtest 등) fire 시 재현 검증. AskUserQuestion 가설 (a) 정확도 박제. lesson dispatch
- [ ] watch.log 의 `still active` / `idle accumulating` 누적 patten 검토 (사이클 5+ 후) — 누락 감지 / false positive / threshold 튜닝 input
- [ ] CYCLE_SOFT / IDLE_THRESHOLD 환경변수 사용자 가시 위치 (CLAUDE.md ?) — 현재 plist 안 envvar 미박제, watch.sh default 만. 운영 중 조정 필요 시 plist 또는 별도 config 검토

## 7. 호환성

- 기존 watch.sh signal 처리 + tmux send 시퀀스 변경 X
- SKILL.md 의 cycle_state JSON 스키마 변경 X (기존 정상 cycle 영향 X)
- active-cycle 파일 부재 = 기존 cycle 처리 그대로 (timeout 검사 skip)
- `do_kill` 의 cycle_state 자동 박제 = 본 메인이 이전 수동 박제 (cycle 24) 와 동일 형식
- R7 자동 머지 정책 적용 (4 prefix `fix(dc-watch):` 포함)
