# cycle 48 — fire hang detection (warm-up race + silent hang)

**날짜**: 2026-05-05
**chain**: fix-incident
**선행**: cycle 42.5 hotfix (auto-fire hardening) + cycle 43 (pane wrapper validation)
**R5 정정 6번째 후보**: 본 사이클은 spec + watch.sh 적용. 진짜 PASS 박제는 cycle 49 first real fire 실측 시점.

## 1. 본 사이클 발화 경로

cycle 47 박제 (23:10) → signal next_n=35 → watch.sh 23:12:21 fire (sequence: `/exit + C-d + handoff load + develop-cycle 35`) → **새 claude 8h 39m hang** → 사용자 attach 후 "뭔데 왜 또 멈춰있냐" → 본 cycle 48 진단 시작.

watch.log 23:12 entry 후 8h 0건 = silent hang. active-cycle 파일 빈 상태 = `check_timeout` 즉시 return = hang 영원히 안 감지.

## 2. Phase 1 — Root cause investigation

### 본 fire 시퀀스 (watch.sh line 339-346)

```bash
send "/exit" Enter
sleep 2
send C-d
sleep 12               # 새 claude warm-up
send "/handoff load" Enter
sleep 8
send "/develop-cycle $next_n" Enter
```

총 warm-up = 14초. cycle 42.5 hotfix 잔여 한계 #3 (12s 부족).

### 본 hang 의 검증 가능 사실

- PID 56111 (새 claude) etime 8h 39m = 23:12 fire 시점 일치
- watch.log 23:12 이후 entry 0건 → send-keys success 후 새 claude 명령 처리 X
- active-cycle 빈 상태 = 새 claude 가 develop-cycle 진단 단계 진입 X
- signal 빈 상태 = 다음 fire trigger X = idle 영원

### 22:42 / 23:01 fire 와의 차이

| 시각 | next_n | 결과 | 차이? |
|---|---|---|---|
| 22:42 | 1 | PASS (22:50 stop) | 첫 검증 fire |
| 23:01 | 36 | PASS (23:10 cycle 47 박제) | 정상 chain |
| **23:12** | **35** | **hang 8h** | system load? warm-up race? |

원인 모호 — random race 가능. cycle 42 first fire 21:42 + cycle 42.5 22:06 도 동일 패턴 (send-keys fail). cycle 43 fix 는 ensure_session 만 검증, send-keys race 자체 차단 X.

## 3. Phase 2 — Pattern analysis

`check_timeout()` (watch.sh line 222-304) 의 차단점:

```bash
[ ! -f "$ACTIVE" ] && return 0   # ← line 223
```

active-cycle 파일 부재 = 즉시 return = 다른 어떤 검사도 안 함.

**지금 흐름**:
1. cycle 47 회고 끝 → active-cycle cleanup (rm)
2. signal next_n=35 박제
3. watch.sh fire (23:12) → 새 claude spawn
4. 새 claude warm-up race → /handoff load 무시 → develop-cycle 진입 X → active-cycle 박제 X
5. **active-cycle 부재 = check_timeout return 0** = 영원히 hang

본 갭 = cycle 24 hang safety v2 (PR `fix(dc-watch): cycle hang safety v2`) 의 미커버 영역. v2 는 진단 단계 들어간 cycle 의 timeout 만 검사. fire ↔ 진단 사이 갭 무방어.

## 4. Phase 3 — Hypothesis

가설 H1: **warm-up 12s 부족** — 새 claude TUI stdin attach 가 12s 넘어 race 발생
가설 H2: **fire ↔ active-cycle 박제 사이 silent gap 무검사** — H1 random fail 시 영원 hang

H1 단독 fix = race 폭만 줄임 (확률 감소). H2 fix = race 발생해도 자동 감지 + 사용자 가시. **H2 가 hang safety 우선**.

## 5. Phase 4 — Implementation

### 5.1 watch.sh fire 시퀀스 강화

```diff
@@ line 338
       SEND_FAILED=0
       send "/exit" Enter
       sleep 2
       send C-d
-      sleep 12
+      sleep 20         # warm-up 12s → 20s (race 폭 줄임, H1)
+
+      # FIRE_PENDING placeholder 박제 (H2 — silent hang 감지)
+      # 새 claude 가 진단 단계 진입 시 cycle_state 정상 PID 로 덮어씀.
+      # 진단 진입 못 하면 본 placeholder 가 check_timeout 의 hang detector 로 작동.
+      cat > "$ACTIVE" <<EOF
+$next_n
+FIRE_PENDING
+$(date +%s)
+EOF
+
       send "/handoff load" Enter
       sleep 8
       send "/develop-cycle $next_n" Enter
```

### 5.2 check_timeout marker 인식

```diff
@@ line 230
   if ! [[ "$cycle_n" =~ ^[0-9]+$ ]] || ! [[ "$pid" =~ ^[0-9]+$ ]] || ! [[ "$started_at" =~ ^[0-9]+$ ]]; then
+    # FIRE_PENDING marker = fire 직후 placeholder. 새 claude 진단 진입 대기 중.
+    if [ "$pid" = "FIRE_PENDING" ] && [[ "$started_at" =~ ^[0-9]+$ ]]; then
+      now=$(date +%s)
+      elapsed=$(( now - started_at ))
+      if [ "$elapsed" -gt "$FIRE_HANG_THRESHOLD" ]; then
+        log "FIRE_HANG cycle=$cycle_n elapsed=${elapsed}s — 새 claude 진단 단계 진입 못함 (warm-up race?)"
+        notify_fail "FIRE HANG cycle $cycle_n: ${elapsed}s silent. mcc 재진입 + /handoff load 권장."
+        rm -f "$ACTIVE" "$IDLE_SINCE"
+      fi
+      return 0
+    fi
     log "active-cycle malformed — discarding ..."
     rm -f "$ACTIVE" "$IDLE_SINCE"
     return 0
   fi
```

`FIRE_HANG_THRESHOLD=300` (5분) 추가 (line 27 부근 변수 영역).

### 5.3 develop-cycle SKILL active-cycle 박제 (덮어쓰기 충돌 X)

본 SKILL 단계 1 첫 step 에 이미 `cat > active-cycle <<EOF` 로 박제. 본 placeholder 자연스레 덮어씀. 변경 X.

## 6. 검증 방안

### isolated smoke (R5 룰 단독 신뢰 X)

```bash
# 가짜 fire 시뮬레이션
cat > ~/.develop-cycle/active-cycle <<EOF
99
FIRE_PENDING
$(($(date +%s) - 400))
EOF
~/.develop-cycle/watch.sh   # check_timeout 호출
# 기대: FIRE_HANG log + telegram + active-cycle cleanup
```

### 진짜 PASS (R5 룰 충족)

cycle 49 first real fire 실측 시점:
- 사용자 mcc 재진입 + signal 박제 → watch.sh fire
- (성공) 새 claude 가 active-cycle 정상 박제 → cycle 49 진행 → cycle 50 chain
- (실패) FIRE_PENDING 5분 silent → log + telegram → 사용자 가시

**본 cycle 48 outcome**: 검증 대기 = `partial`. cycle 49 first fire 실측 결과 박제 후 cycle 49 retro 에서 cycle 48 outcome 정정.

## 7. R5 정정 6번째 후보

| # | 사이클 | 거짓 박제 | 정정 시점 | 차단 fix |
|---|---|---|---|---|
| 1 | 25/26 | "watch.sh fire 검증" | 33 | PPID chain |
| 2 | 39/40 | "base PR 자동 fire 작동" | 41 | fire 시퀀스 |
| 3 | 41 | "fire 시퀀스 검증" | 42 first fire | hotfix |
| 4 | 42.5 hotfix | "smoke + SIGINT survival 통과" | 42.5 22:06 second fire | cycle 43 fix |
| 5 | 42.5 ensure_session | "session 검증 충분" | cycle 43 진단 | pane wrapper |
| **6** | **43 ensure_session** | **"pane wrapper = 자동 fire 충분"** | **cycle 48 본 hang** | **FIRE_HANG detection** |

다음 잠재 R5 후보: cycle 49 first real fire 실측 시 본 fix 가 race 차단 했는지 + 또 다른 layer 잔여 한계 발견 여부.

## 8. 잔여 한계

본 fix 차단 X:
- (a) **새 claude warm-up 30s+ race** — sleep 20s 도 부족할 수 있음. 본 fix 는 hang 후 detection + 사용자 가시 (자동 복구 X)
- (b) **send-keys 가 도달했는데 새 claude TUI 가 입력 무시** — pane buffer 받은 것과 처리한 것 차이. capture-pane verify layer 필요 (별도 cycle)
- (c) **/handoff load 에서 hang** — handoff skill 안 ToolSearch / WebFetch 무한 대기. develop-cycle 진단 진입 후라 active-cycle 정상 박제됨. check_timeout v2 가 idle 5m 후 자동 kill

## 9. 본 cycle 48 chain stop 조건

- spec doc PR 박제 + watch.sh 사용자 영역 적용 (cycle 43 패턴) = `partial` 박제
- cycle 49 first real fire 실측 = `success` 정정 (cycle 49 retro 시점)

본 cycle 박제 후 사용자 mcc 재진입 + cycle 49 호출 = 본 fix 진짜 검증 시점.
