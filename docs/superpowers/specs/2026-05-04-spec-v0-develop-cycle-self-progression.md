# spec_v0 — develop-cycle 자동 진행 메커니즘 재설계 (cycle 34, expand-scope step 1)

**일자**: 2026-05-04
**Cycle**: 34 (chain=expand-scope, step 1: `/superpowers:brainstorming` + `/office-hours`)
**Status**: spec_v0 박제 (사용자 자리 비움, 본 메인 자가 진행)
**다음 step**: cycle 35 (`/plan-ceo-review` SCOPE EXPANSION → spec_v1)

---

## 0. 사용자 의도 (1순위)

> "알아서 세션관리해서 gstack/superpower 스킬 (오피스아워, 브레인스토밍, ceo/eng/design 리뷰) 까지 순차적으로 세션 넘겨가면서 50사이클까지 작업해놓으라고 시켜놨잖아."

명시 의도: **N=50 자율 진행**. 사용자 manual intervention 0회. 사이클 사이 컨텍스트 carry-over + sub-skill 발화 + ship + retro 모두 본 메인 자율.

**현재 메커니즘 한계** (cycle 33 진행 중 발견):
- watch.sh fire 메커니즘이 mcc 환경 (`caffeinate -i command claude` 직접 spawn 패턴) 에서 작동 X
- `send "exit"` → 메인 claude 종료 → caffeinate 종료 → tmux pane 자동 close → 새 claude 시작 명령 닿을 곳 없음
- cycle 25/26 = mcc 밖 환경 (검증 불일치) / cycle 27~32 = 본 세션 manual 진행 → **mcc 안 자동 fire 한 번도 실측 X**
- 박제 "검증됐다" = R5 위반. 본 cycle 33 발견 후 정정.

---

## 1. 문제 정의

자동 진행 메커니즘이 충족해야 할 요건 5개:

1. **mcc 환경 native 작동** — caffeinate → claude 패턴 안에서 새 claude process spawn 가능
2. **컨텍스트 carry-over** — 매 cycle 새 process 라도 cycle_state JSON / handoff fingerprint / 사용자 강제 룰 자연 read
3. **multi-claude race 방지** — 다중 claude 환경 (사용자가 mcc 외 다른 claude 띄운 환경) 에서도 정확한 본 메인만 추적 (cycle 33 PPID chain fix carry-over)
4. **sub-skill hang 보호** — brainstorming/office-hours/ceo/eng/design 등 sub-skill 발화 시 hang 위험 → watch.sh hard cap 60m + 자동 kill + cycle_state interrupted 박제
5. **사용자 manual intervene 가능** — 50 cycle 진행 중 사용자가 stop / 변경 / 재시작 모두 가능. signal next_n=0 박제로 정지

---

## 2. 6 forcing question (office-hours startup 모드, 본 메인 자가 답변)

### Q1. **수요 현실 (Demand reality)** — 누가 진짜 이걸 원하는가?

**A**: 사용자 1명 (본 프로젝트 주인). 50 cycle 자율 진행 명시 의도 + 자리 비움 + manual intervene X 의도. 다른 사용자 X (개인 도구 영역).

### Q2. **현 상태 (Status quo)** — 지금은 어떻게 해결하나?

**A**: 본 세션 turn 안 manual 진행 (cycle 27~31 패턴). 사용자가 mcc 안에서 N 입력 후 본 메인이 N 번 turn 진행. 한계:
- 한 세션 컨텍스트 = ~200K token. 한 cycle = 평균 ~3-5K token (sub-skill 발화 시 더 큼). 50 cycle = ~250K = 컨텍스트 한계 도달
- 사용자 자리 비움 시 본 메인이 컨텍스트 한계 추정 X (SKILL.md 박제 룰: 사용자 % 알림만)
- 한계 도달 시 handoff save 자동 = 다음 mcc 세션 manual 진입 필요 = 사용자 manual intervene

### Q3. **간절한 specificity (Desperate specificity)** — 정확히 어떤 작업?

**A**: 사용자 강제 룰 = cycle 34~38 (expand-scope step 펼침) → cycle 39+ (구현). 즉:
- cycle 34: brainstorming + office-hours → spec_v0 박제 ← **본 cycle**
- cycle 35: ceo-review → spec_v1
- cycle 36: eng-review → spec_v2
- cycle 37: design-review → spec_v3
- cycle 38: writing-plans → plan.md
- cycle 39+: 구현 (subagent-driven 또는 직접) — 본 spec/plan 의 메커니즘 구현 시점

본 spec_v0 의 주제 = "develop-cycle skill 자동 진행 메커니즘 재설계". 즉 cycle 34~38 spec/plan 박제 + cycle 39+ 구현 = 다음 N=50 사이클 진짜 자동 진행 가능 환경 구축.

### Q4. **가장 좁은 wedge (Narrowest wedge)** — 가장 작은 첫 step?

**A**: **mcc 환경에서 새 claude process spawn 패턴 결정**. 옵션 3개:

#### 옵션 A — pane 안 shell wrapper
- mcc alias 변경: `alias mcc='tmux new -As claude bash -c "while true; do claude; done"'`
- 메인 claude 종료 → bash while loop 가 새 claude 시작
- send "exit" 보내면 자동 재시작 → watch.sh 가 그 후 `/handoff load` + `/develop-cycle <next_n>` 명령

장점: 단순. mcc alias 1 line 변경.
단점: 사용자 영역 변경 필요. 매 사용자 reboot/터미널 새로 열 때 갱신.

#### 옵션 B — claude `--resume` 또는 새 session ID 활용
- `claude --resume <conv_id>` 또는 새 conv 시작 명령
- watch.sh 가 본 메인 claude 의 conversation 상태 추적 + 새 cycle 시 새 conv 시작
- 본 메인이 종료 안 하고 새 conv 시작 = pane 유지

장점: pane close 회피.
단점: claude CLI 의 새 conv 시작 명령 정확 모름. 검증 필요.

#### 옵션 C — 본 세션 안 cycle 50 turn 직진 + 컨텍스트 한계 시 fresh process
- 본 메인이 새 cycle 마다 새 turn 시작 (현재 cycle 27~31 패턴)
- 컨텍스트 % 본 메인 자가 측정 + 70% 도달 시 handoff save + signal next_n + 본 세션 종료 의도
- 사용자가 다음 mcc 세션 진입 시 자동 fire (signal 감지) → 새 cycle 시작

장점: pane close 회피. mcc alias 변경 X.
단점: 사용자가 다음 mcc 세션 manual 진입 필요 = 자동 X. 컨텍스트 추정 신뢰성.

#### 옵션 D — pane 안 두 process: claude + watcher
- mcc 시작 시 pane 0 = claude, pane 1 = watcher
- watcher 가 signal 감지 + pane 0 에 send-keys (`/develop-cycle <next_n>` 직접 입력) → 본 메인 conversation 안 새 cycle prompt 입력
- 본 메인 종료 X. 매 cycle 같은 conversation 이라 컨텍스트 누적.

장점: pane close 회피. send-keys 직접 활용.
단점: 컨텍스트 누적 → 50 cycle 도달 한계. 또한 본 메인 turn 안 자동 입력 = 자가 prompt = 자율성 낮음.

**가장 좁은 wedge = 옵션 A** (mcc alias 변경 1 line). 사용자 영역 변경 필요지만 사용자가 자리 돌아왔을 때 1 line 추가 = 1 분. 그 후 50 cycle 모두 watch.sh 자동 fire.

옵션 B/C/D 는 후속 cycle 35 (eng-review) 에서 architectural 깊이 평가 후 결정.

### Q5. **관찰 (Observation)** — 어디서 사용자 행동 관찰?

**A**: 자리 비움 = 직접 행동 관찰 X. 그러나:
- cycle 27~31 패턴 = 사용자가 manual 5 cycle 호출 후 본 메인이 turn 안 진행. 즉 사용자 관찰 = "한 번 호출 후 자리 비움" 패턴
- cycle 33 진행 중 사용자가 "한거야?" 묻기 전까지 자리 비움 = 자동 진행 의도 100% 검증
- 사용자 화남 = 자동 진행 메커니즘 부재의 비용 (사용자 시간 낭비) 노출. **메커니즘 fix 의 가치 직접 검증**

### Q6. **미래 적합성 (Future-fit)** — 1년 후?

**A**: develop-cycle skill 의 미래 = 사용자가 명령 1회 (`/develop-cycle 50` 또는 더 큰 N) 후 며칠~몇주 자리 비움 + 본 메인이 자율 progression. 즉:
- 자동 fire 메커니즘 = 필수 (없으면 사용자 영역 의존)
- 사이클 사이 컨텍스트 carry-over = 필수 (cycle_state JSON 충분)
- sub-skill hang 보호 = 필수 (watch.sh hard cap 검증됨)
- multi-claude race 방지 = 필수 (cycle 33 PPID chain fix 박제)

본 메커니즘 부재 = "develop-cycle skill 사용자 영역 의존" = 가치 50% 손실. 본 spec/plan/구현 = skill 의 진짜 자율성 완성.

---

## 3. wedge 선택 = 옵션 A (mcc alias 변경) + watch.sh socket 지원

### 3.1 mcc alias 변경 (사용자 영역 1 line)

```bash
# ~/.zshrc
alias mcc='tmux new -As claude bash -c "while true; do caffeinate -i command claude || break; done"'
```

핵심: bash while loop 안 claude. claude exit → bash 가 break check → break 안 했으면 새 claude. exit code 비정상 (예: SIGTERM) 시 break = 사용자 manual stop 가능.

### 3.2 watch.sh socket + target 지원

```bash
# ~/.develop-cycle/watch.sh 변경
TMUX_SOCKET="${TMUX_SOCKET:-default}"
TMUX_TARGET="${TMUX_TARGET:-claude}"

send() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY_RUN send: $*"
  elif [ "$TMUX_SOCKET" = "default" ]; then
    tmux send-keys -t "$TMUX_TARGET" "$@" 2>/dev/null || log "send-keys fail target=$TMUX_TARGET"
  else
    tmux -L "$TMUX_SOCKET" send-keys -t "$TMUX_TARGET" "$@" 2>/dev/null || log "send-keys fail socket=$TMUX_SOCKET target=$TMUX_TARGET"
  fi
}
```

### 3.3 active-cycle 박제 시 socket+target 자동 감지

```bash
# SKILL.md 단계 1 첫 step 추가
TMUX_SOCKET=$(echo "$TMUX" | sed 's|.*/tmux-[0-9]*/||;s|,.*||;s|/.*||' 2>/dev/null || echo default)
TMUX_TARGET=$(tmux display-message -p '#{session_name}' 2>/dev/null || echo claude)
echo "$TMUX_SOCKET" > ~/.develop-cycle/tmux-socket
echo "$TMUX_TARGET" > ~/.develop-cycle/tmux-target
```

watch.sh 가 그 파일 read.

### 3.4 fire 시퀀스 변경

```bash
# 현재 (mcc 환경 X)
send "exit" Enter
sleep 2
send "claude" Enter
sleep 12
send "/handoff load" Enter
sleep 8
send "/develop-cycle $next_n" Enter

# 새 시퀀스 (mcc alias bash while loop 환경 OK)
send "/exit" Enter   # claude 의 /exit 명령 (현재 cycle 종료, 새 conv 시작 X)
# 또는
send C-c            # SIGINT
send "/exit" Enter
sleep 8             # bash while loop 가 새 claude 시작 시간
send "/handoff load" Enter
sleep 8
send "/develop-cycle $next_n" Enter
```

핵심: `/exit` (claude slash command) 또는 SIGINT → claude 종료 → bash while loop 가 새 claude 시작 → send-keys 가 새 claude 의 conversation 에 명령 입력.

---

## 4. 후속 step

### cycle 35 (ceo-review SCOPE EXPANSION)
- 옵션 A vs B vs D 비교 + 더 큰 자율성 옵션 (예: claude API 직접 spawn / 다른 mcc 세션 + 동시 진행 / handoff 완전 자동) 검토
- 사용자 의도 (50 cycle 자율) 충족 + 더 큰 product 가치 (모든 사용자 dev 환경 적용 가능 일반화)

### cycle 36 (eng-review)
- 옵션 A 의 architectural risk 평가 — bash while loop 의 zombie process / 컨텍스트 leak / signal 처리 / mcc reboot 시 재설치
- watch.sh socket 자동 감지 신뢰성

### cycle 37 (design-review)
- 사용자 인지 — alias 변경 가시성 / 처음 1회 install / debug 경험
- DESIGN.md 갱신 필요성

### cycle 38 (writing-plans)
- 위 4 review 결과 종합 → 단계적 구현 plan
- 단계 1: watch.sh socket 지원 (글로벌 변경, 즉시)
- 단계 2: SKILL.md active-cycle socket 자동 감지
- 단계 3: mcc alias 변경 (사용자 영역, 자연 트리거 — 다음 mcc 시작 시)
- 단계 4: fire 시퀀스 검증 (DRY_RUN + 실제 mcc 안 fire)

### cycle 39+ (구현)
- 단계 1~4 PR 단위 분할. R7 자동 머지.
- 검증: 1 cycle ship 후 watch.sh 가 새 cycle 자동 fire → 본 메인이 새 cycle 진행 → 반복

---

## 5. 본 cycle 34 박제 결과

- spec_v0 본 파일 (240+ 줄)
- chain = expand-scope step 1
- 다음 step = cycle 35 ceo-review SCOPE EXPANSION 모드 자율
- N=50 carry-over: 잔여 48 cycle (cycle 35~82)

본 spec_v0 = "develop-cycle skill 진짜 자율성 완성" 의 출발점. cycle 35~38 sub-skill review 가 spec 정제 + cycle 39+ 구현 = N=50 시리즈의 진짜 가치 (본 발견된 메커니즘 결함 fix).
