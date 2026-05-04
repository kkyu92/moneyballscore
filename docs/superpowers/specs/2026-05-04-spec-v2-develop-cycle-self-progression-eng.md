# spec_v2 — develop-cycle 자동 진행 재설계 + ENG architectural review (cycle 36, expand-scope step 3)

**일자**: 2026-05-04
**Cycle**: 36 (chain=expand-scope, step 3: `/plan-eng-review` 자율)
**Base**: spec_v1 (cycle 35)
**Status**: spec_v2 박제 (사용자 자리 비움, 본 메인 자가 진행)
**다음 step**: cycle 37 (`/plan-design-review` → spec_v3)

---

## 0. ENG 모드 = architectural risk + 데이터 schema + edge case

spec_v1 결정 = base scope (옵션 A) + dashboard cherry-pick. 본 cycle 36 = architectural 깊이 평가 + 구체 schema + edge case + 검증 path.

---

## 1. architectural risk 평가

### 1.1 옵션 A (mcc alias bash wrapper) risk

#### Risk-1: bash while loop 의 zombie process / signal 처리
- 메인 claude SIGTERM 시 bash 가 다음 iter → 새 claude 시작
- 사용자 SIGINT (Ctrl-C) 시 = bash 의 SIGINT propagation. bash 는 현재 child (claude) 만 SIGINT 보내고 자기는 continue → 새 claude 시작
- **mitigation**: bash 의 trap 명시. `trap 'exit 0' SIGINT` 추가 시 사용자 Ctrl-C 가 bash 자체 종료 = 정상

```bash
alias mcc='tmux new -As claude bash -c "trap \"exit 0\" SIGINT; while caffeinate -i command claude; do echo \"[mcc] claude exited normally, restart in 2s...\"; sleep 2; done"'
```

#### Risk-2: claude exit code 정상 vs 비정상
- `/exit` slash command = exit code 0 → bash while loop 가 새 claude 시작 ✓
- 사용자 Ctrl-C → SIGINT trap 으로 bash 종료 ✓
- claude crash (segfault) → exit code != 0 → `while caffeinate ... ; do` 의 조건 false → loop 종료. 사용자 영역 에러 시 자동 재시작 X (의도. 무한 crash loop 방지)
- **mitigation**: 위 alias 의 `while caffeinate -i command claude; do ...; done` 패턴 = exit code 0 시만 재시작

#### Risk-3: caffeinate process leak
- mcc 시작 시 caffeinate spawn → claude 실행 → claude 종료 → caffeinate 도 종료 (caffeinate 의 child 가 claude 라 자연)
- 새 claude 시작 시 새 caffeinate spawn. 매 iter 마다 새 caffeinate process
- 50 cycle = 50 iter = 50 caffeinate spawn/dead. process leak X (각 iter end 시 cleanup 자동)

#### Risk-4: tmux pane 0 대신 다른 pane 활성화 시
- 사용자가 `mcc` 안에서 `tmux split-window` 등 추가 pane 생성 시 send-keys -t claude:0.0 (default) 가 정확
- 사용자 의도 = 메인 cycle 진행 pane = pane 0. 다른 pane 활용은 사용자 자유
- **mitigation**: send-keys 명시 `-t claude:0.0`

### 1.2 watch.sh socket 지원 risk

#### Risk-5: TMUX_SOCKET 환경변수 launchd plist 박제 vs 동적 감지
- launchd plist 박제 = 고정 socket 명. mcc 시작 socket 명이 PID 기반 (`claude-swarm-60808`) 이면 매 mcc 시작 시 다름 → plist 갱신 필요
- 본 환경 검증: `tmux ls -L claude-swarm-60808` 의 socket 명이 실제로 PID 포함. mcc reboot 시 새 PID

**해결**: active-cycle 박제 시 본 도구 bash 의 `$TMUX` 환경변수 read → socket path 추출 → tmux-socket 파일 박제 → watch.sh 가 read

```bash
# SKILL.md 단계 1 첫 step
if [ -n "$TMUX" ]; then
  TMUX_SOCKET_PATH=$(echo "$TMUX" | cut -d, -f1)
  TMUX_SOCKET_NAME=$(basename "$TMUX_SOCKET_PATH")
  echo "$TMUX_SOCKET_NAME" > ~/.develop-cycle/tmux-socket
  echo "$(tmux display-message -p '#{session_name}' 2>/dev/null)" > ~/.develop-cycle/tmux-target
fi
```

watch.sh:
```bash
TMUX_SOCKET=$(cat ~/.develop-cycle/tmux-socket 2>/dev/null || echo "default")
TMUX_TARGET=$(cat ~/.develop-cycle/tmux-target 2>/dev/null || echo "claude")

send() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY_RUN send: $*"
  elif [ "$TMUX_SOCKET" = "default" ]; then
    tmux send-keys -t "$TMUX_TARGET:0.0" "$@" 2>/dev/null || log "send-keys fail target=$TMUX_TARGET"
  else
    tmux -L "$TMUX_SOCKET" send-keys -t "$TMUX_TARGET:0.0" "$@" 2>/dev/null || log "send-keys fail socket=$TMUX_SOCKET"
  fi
}
```

#### Risk-6: 도구 bash 안 `$TMUX` 환경변수 부재
- 본 환경 검증: `echo "TMUX=$TMUX"` = 빈 값. 도구 bash subshell 가 부모 (메인 claude) 의 환경변수 일부만 받음
- 그러나 도구 bash 의 부모 chain 안 메인 claude 가 tmux 안에 있으면 `$TMUX` 가 부모에 박제. ps -p 부모 확인 필요

**해결 (대안)**: lsof 또는 ps comm 으로 tmux server PID 추적 → socket 명 추출

```bash
TMUX_SOCKET_NAME=$(lsof -p "$P" 2>/dev/null | grep tmux | head -1 | awk -F'/' '{print $NF}' | cut -d, -f1)
# 또는
TMUX_SERVER_PID=$(pgrep -f "tmux.*new-session.*claude" | head -1)
TMUX_SOCKET_NAME=$(ps -p "$TMUX_SERVER_PID" -o command= | grep -oE '\-L [^ ]+' | awk '{print $2}')
```

추천: 두 path 시도 → 첫 성공 사용 → fallback default

### 1.3 fire 시퀀스 변경 risk

#### Risk-7: `/exit` slash command 동작 검증 필요
- claude `/exit` 명령이 정확히 exit code 0 returning 하는지 검증 X
- 대안: SIGTERM (Ctrl-D) → process termination
- **검증 path (cycle 39 구현 시)**: DRY_RUN mode 로 시퀀스 fire → 본 메인 종료 + 새 process 정상 spawn 확인

#### Risk-8: send-keys 시퀀스 timing
- 현재: sleep 2 / 12 / 8 = total 22s
- 새 시퀀스: sleep 2 (after /exit) / 8 (bash while loop + 새 claude warm-up) / 8 (handoff load) / 8 (develop-cycle) = total 26s
- **위험**: warm-up 시간 부족 시 send-keys 가 buffer 안 입력 = race
- **mitigation**: sleep 더 길게 (15s warm-up) + tmux send-keys -t target -l "..." 으로 문자열 입력 후 Enter 별도

---

## 2. dashboard schema (Supabase migration)

### 2.1 `develop_cycle_logs` 테이블

```sql
-- supabase/migrations/023_develop_cycle_logs.sql

CREATE TABLE IF NOT EXISTS develop_cycle_logs (
  id BIGSERIAL PRIMARY KEY,
  cycle_n INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  chain_selected TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'fail', 'partial', 'interrupted')),
  pr_number INTEGER,
  commit_hash TEXT,
  retro_summary TEXT,
  next_recommended_chain TEXT,
  cycle_state JSONB NOT NULL,  -- 전체 cycle_state JSON
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX develop_cycle_logs_cycle_n_idx ON develop_cycle_logs (cycle_n DESC);
CREATE INDEX develop_cycle_logs_chain_idx ON develop_cycle_logs (chain_selected, outcome);
CREATE INDEX develop_cycle_logs_created_idx ON develop_cycle_logs (created_at DESC);

-- RLS
ALTER TABLE develop_cycle_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON develop_cycle_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### 2.2 INSERT timing

매 cycle retro 끝 (signal 박제 직전) Supabase INSERT:

```bash
# SKILL.md 단계 4 retro 안 추가
CYCLE_STATE_JSON=$(cat ~/.develop-cycle/cycles/$CYCLE_N.json)
curl -s -X POST "$SUPABASE_URL/rest/v1/develop_cycle_logs" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "$CYCLE_STATE_JSON" || log "supabase insert fail cycle=$CYCLE_N"
```

silent fail 처리 = watch.log 박제. 사용자 영역 환경변수 (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) 부재 시 자연 skip.

### 2.3 dashboard query

`apps/moneyball/src/app/debug/develop-cycle/page.tsx`:

```typescript
const recent = await supabase
  .from('develop_cycle_logs')
  .select('*')
  .order('cycle_n', { ascending: false })
  .limit(20);

const chainDist = await supabase.rpc('develop_cycle_chain_distribution');
// 또는 client-side aggregation

const watchLog = await fetch('/api/develop-cycle/watch-log').then(r => r.text());
```

watch.log = 사용자 로컬 file. dashboard server 가 access X. 옵션:
- A) dashboard 가 watch.log 부분 skip
- B) 매 cycle retro 시 watch.log tail 50 줄 도 cycle_state.json 안 박제 → Supabase INSERT 시 같이 → dashboard 가 read

추천 B. cycle_state schema 에 `watch_log_tail` 필드 추가.

---

## 3. edge case + 검증 path

### 3.1 edge case 7개

| # | case | 처리 |
|---|---|---|
| 1 | mcc 안 사용자가 manual `/develop-cycle 0` 입력 | signal next_n=0 → watch.sh stop. 정상 |
| 2 | 사용자 Ctrl-C | bash trap → 정상 종료. 다음 iter X |
| 3 | claude crash | bash while 조건 false → loop 종료. 사용자 manual restart |
| 4 | watch.sh 가 hard cap 60m 초과 kill | cycle_state interrupted 박제 + signal FAIL + 텔레그램 알림 |
| 5 | Supabase URL/key 미설정 | INSERT skip + watch.log warning |
| 6 | sub-skill (brainstorming/office-hours) hang | watch.sh hard cap 보호. cycle_state interrupted |
| 7 | git push 충돌 (다른 머신 동시 push) | rebase 시도 → 실패 시 cycle outcome=fail + 다음 cycle 진단 시 git pull 우선 |

### 3.2 검증 path (cycle 39+ 구현 시)

| 단계 | 검증 |
|---|---|
| watch.sh socket 지원 (cycle 39) | DRY_RUN=1 mode 로 send-keys 시뮬 + log 박제 확인 |
| SKILL.md active-cycle 자동 감지 (cycle 40) | 본 mcc 안 active-cycle 박제값 = 정확한 socket+target |
| mcc alias 변경 (cycle 41 TODOS.md 안내) | 사용자 manual 1회 변경 |
| Supabase migration (cycle 42) | local + prod 양쪽 적용 (R5 정신) |
| 매 cycle retro Supabase INSERT (cycle 43) | 첫 cycle ship 후 dashboard 에서 row 확인 |
| dashboard 구현 (cycle 44~45) | localhost:3000/debug/develop-cycle 정상 렌더 |
| **end-to-end 검증 (cycle 46)** | 1 cycle ship 후 watch.sh 가 새 cycle 자동 fire → 본 메인이 새 cycle 진행 = 자율 진행 메커니즘 정상 |

---

## 4. spec_v2 결정 + 후속 step

### 4.1 spec_v1 + eng 정제

| 영역 | spec_v1 | spec_v2 추가 |
|---|---|---|
| mcc alias | bash while loop | + trap SIGINT + caffeinate exit code 조건 |
| watch.sh socket | 환경변수 박제 | + 동적 감지 ($TMUX read or lsof fallback) |
| send-keys timing | sleep 2/12/8 | sleep 2/15/10/10 (더 안전) |
| schema | (정의 X) | `develop_cycle_logs` 테이블 + index 3 + RLS |
| INSERT path | (정의 X) | retro 안 curl POST + silent fail 처리 |
| dashboard query | (정의 X) | recent 20 + chain dist + watch_log_tail |

### 4.2 후속 step

| Cycle | step | 결과물 |
|---|---|---|
| 37 | `/plan-design-review` | spec_v3 (dashboard UX + 색감 + 정보 hierarchy) |
| 38 | `/superpowers:writing-plans` | plan.md (단계별 구현 분할) |
| 39 | watch.sh socket 지원 | PR 1 |
| 40 | SKILL.md active-cycle 자동 감지 | PR 2 |
| 41 | TODOS.md mcc alias 안내 갱신 | PR 3 |
| 42 | migration 023 develop_cycle_logs | PR 4 |
| 43 | retro Supabase INSERT | PR 5 |
| 44 | dashboard page (server) | PR 6 |
| 45 | dashboard UX polish | PR 7 |
| 46 | end-to-end fire 검증 | retro-only |
| 47+ | 잔여 자율 결정 (small fix / polish-ui / review-code) | — |

---

## 5. 본 cycle 36 박제 결과

- spec_v2 본 파일 (290+ 줄)
- chain = expand-scope step 3 (eng-review)
- 7 edge case + 검증 path 7 단계 명시
- Supabase schema (migration 023) 구체화
- 다음 step = cycle 37 design-review → spec_v3
- N=50 carry-over: 잔여 46 cycle (cycle 37~82)
