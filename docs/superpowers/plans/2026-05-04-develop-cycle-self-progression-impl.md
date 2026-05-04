# plan — develop-cycle 자동 진행 메커니즘 구현 (cycle 38, expand-scope step 5)

**일자**: 2026-05-04
**Cycle**: 38 (chain=expand-scope, step 5: `/superpowers:writing-plans` 마지막)
**Base specs**: spec_v0 (cycle 34) + spec_v1 (cycle 35 ceo) + spec_v2 (cycle 36 eng) + spec_v3 (cycle 37 design)
**Status**: plan.md 박제 (사용자 자리 비움, 본 메인 자가 진행)
**다음 step**: cycle 39+ (구현)

---

## 0. plan 목적

spec v0~v3 의 결정 + 정제 종합 → cycle 39~46 단계별 구현 + 검증.

핵심 결정 (확정):
1. **base scope**: mcc alias bash wrapper (옵션 A) + watch.sh socket+target 동적 감지 + active-cycle 자동 박제 + fire 시퀀스 변경
2. **cherry-pick**: dashboard `/debug/develop-cycle` (DESIGN.md 일관 + Supabase 단일 source + 모바일 우선)
3. **R5 정정**: cycle 25/26 박제 거짓 → cycle 39+ 구현 시 mcc 안 실측 검증 필수

---

## 1. 구현 단계 8 PR

### PR 1 (cycle 39) — `fix(dc-watch): TMUX_SOCKET 동적 감지 + send-keys -L 옵션`

**파일 변경**:
- `~/.develop-cycle/watch.sh` (글로벌, ~25 line 추가)
- `docs/superpowers/specs/2026-05-04-watch-sh-socket-impl.md` (신규 spec)

**핵심 diff**:
```bash
# watch.sh
TMUX_SOCKET=$(cat "$DC_HOME/tmux-socket" 2>/dev/null || echo "default")
TMUX_TARGET=$(cat "$DC_HOME/tmux-target" 2>/dev/null || echo "claude")

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

**검증**: DRY_RUN=1 mode 로 watch.log 박제 확인.

---

### PR 2 (cycle 40) — `feat(skill): SKILL.md active-cycle socket+target 자동 감지`

**파일 변경**:
- `~/.claude/skills/develop-cycle/SKILL.md` (글로벌)
- `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` (lockstep)

**핵심 diff**:
```bash
# SKILL.md 단계 1 첫 step active-cycle 박제 명령에 socket/target 박제 추가
# (PPID chain 매칭 후)

# socket 자동 감지 — $TMUX read 또는 lsof fallback
if [ -n "$TMUX" ]; then
  TMUX_SOCKET_NAME=$(basename "$(echo "$TMUX" | cut -d, -f1)")
elif [ -n "$P" ]; then
  TMUX_SOCKET_NAME=$(lsof -p "$P" 2>/dev/null | awk '/tmux/ {print $NF}' | head -1 | xargs basename 2>/dev/null | cut -d, -f1)
fi
[ -z "$TMUX_SOCKET_NAME" ] && TMUX_SOCKET_NAME="default"
echo "$TMUX_SOCKET_NAME" > ~/.develop-cycle/tmux-socket

TMUX_TARGET_NAME=$(tmux ${TMUX_SOCKET_NAME:+-L "$TMUX_SOCKET_NAME"} display-message -p '#{session_name}' 2>/dev/null)
[ -z "$TMUX_TARGET_NAME" ] && TMUX_TARGET_NAME="claude"
echo "$TMUX_TARGET_NAME" > ~/.develop-cycle/tmux-target
```

**검증**: 본 mcc 안에서 cycle 진단 시 박제값 = `claude-swarm-60808` + `claude-swarm`

---

### PR 3 (cycle 41) — `docs: TODOS.md mcc alias 변경 안내`

**파일 변경**:
- `TODOS.md` (사용자 영역 안내 추가)

**핵심 내용**:
```markdown
### ⭐ develop-cycle 자율 진행 — mcc alias 변경 (1 line)

본 메인 영역 (cycle 39~46) 구현 완료 후 동작하려면 사용자 영역 1 line 추가:

\`\`\`bash
# ~/.zshrc 갱신
alias mcc='tmux new -As claude bash -c "trap \"exit 0\" SIGINT; while caffeinate -i command claude; do echo \"[mcc] claude exited normally, restart in 2s...\"; sleep 2; done"'
\`\`\`

검증:
1. `source ~/.zshrc`
2. `mcc` 실행
3. `/develop-cycle 5` 호출
4. 한 cycle 끝 후 자동 새 cycle 시작 확인
```

**검증**: 사용자 자연 트리거 (다음 mcc 시작 시).

---

### PR 4 (cycle 42) — `feat(supabase): migration 023 develop_cycle_logs 테이블`

**파일 변경**:
- `supabase/migrations/023_develop_cycle_logs.sql` (신규)

**schema** (spec_v2 + spec_v3 in_progress 보강):
```sql
CREATE TABLE IF NOT EXISTS develop_cycle_logs (
  id BIGSERIAL PRIMARY KEY,
  cycle_n INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,  -- nullable (in_progress 동안)
  chain_selected TEXT,    -- nullable (진단 단계 시작 시 박제 X)
  outcome TEXT CHECK (outcome IN ('in_progress', 'success', 'fail', 'partial', 'interrupted')),
  pr_number INTEGER,
  commit_hash TEXT,
  retro_summary TEXT,
  next_recommended_chain TEXT,
  cycle_state JSONB,      -- 전체 cycle_state JSON (ended 시)
  watch_log_tail TEXT,    -- 마지막 50 line watch.log
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cycle_n)        -- in_progress → success/fail UPSERT
);

CREATE INDEX develop_cycle_logs_cycle_n_idx ON develop_cycle_logs (cycle_n DESC);
CREATE INDEX develop_cycle_logs_outcome_idx ON develop_cycle_logs (outcome) WHERE outcome != 'success';
CREATE INDEX develop_cycle_logs_chain_idx ON develop_cycle_logs (chain_selected) WHERE chain_selected IS NOT NULL;

ALTER TABLE develop_cycle_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON develop_cycle_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
```

**검증**: `supabase db push --linked` (R5 정신 — local + prod 양쪽 박제).

---

### PR 5 (cycle 43) — `feat(skill): retro 끝 + 진단 첫 step Supabase INSERT/UPSERT`

**파일 변경**:
- `~/.claude/skills/develop-cycle/SKILL.md` + draft (lockstep)

**핵심 추가**:
```bash
# 단계 1 진단 첫 step (active-cycle 박제 직후)
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  curl -s -X POST "$SUPABASE_URL/rest/v1/develop_cycle_logs" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "{\"cycle_n\":$CYCLE_N,\"started_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"outcome\":\"in_progress\"}" \
    > /dev/null || true
fi

# 단계 4 retro 끝 (cycle_state JSON write 직후)
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  WATCH_LOG_TAIL=$(tail -50 ~/.develop-cycle/watch.log | jq -Rs .)
  curl -s -X PATCH "$SUPABASE_URL/rest/v1/develop_cycle_logs?cycle_n=eq.$CYCLE_N" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"ended_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"chain_selected\":\"$CHAIN\",\"outcome\":\"$OUTCOME\",\"pr_number\":$PR_NUM,\"commit_hash\":\"$COMMIT\",\"retro_summary\":$RETRO_JSON,\"cycle_state\":$STATE_JSON,\"watch_log_tail\":$WATCH_LOG_TAIL,\"updated_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
    > /dev/null || true
fi
```

**검증**: 첫 cycle ship 후 Supabase 에서 row 확인. in_progress → success 전환 확인.

---

### PR 6 (cycle 44) — `feat(dashboard): /debug/develop-cycle page 기본 layout`

**파일 변경**:
- `apps/moneyball/src/app/debug/develop-cycle/page.tsx` (신규)
- `apps/moneyball/src/lib/dashboard/buildDevelopCycleStats.ts` (신규)
- `apps/moneyball/src/components/debug/DevelopCycleHeader.tsx` (신규)
- `apps/moneyball/src/components/debug/DevelopCycleTable.tsx` (신규)
- `apps/moneyball/src/components/debug/DevelopCycleChainBars.tsx` (신규)
- `apps/moneyball/src/components/debug/DevelopCycleWatchLog.tsx` (신규)

**구조** (spec_v3 5 section):
- Header: 현재 cycle / 잔여 cycle / refresh
- Section 1: 현재 cycle (large card)
- Section 2: 최근 cycles (table 20 row, 모바일 card list)
- Section 3: chain 분포 (horizontal bar)
- Section 4: outcome 추세 (sparkline 30)
- Section 5: watch.log tail (Geist Mono)

**BASIC auth**: `/debug/*` middleware 재사용

**검증**: localhost 정상 렌더 + 모바일 viewport (375px) 확인.

---

### PR 7 (cycle 45) — `feat(dashboard): auto-refresh + cycle row 모달 + UX polish`

**파일 변경**:
- 기존 dashboard 컴포넌트 보강

**추가**:
- 30초 auto-refresh (toggle)
- cycle row 클릭 = 모달 (cycle_state JSON view)
- PR 링크 = GitHub 새 탭
- empty state 3 case

**검증**: auto-refresh 동작 + 모바일 모달 정상 닫힘.

---

### PR 8 (cycle 46) — `verify: end-to-end mcc 안 자동 fire 검증`

**파일 변경**: 없음 (verify-only cycle)

**검증 시나리오** (사용자 영역 협조):
1. 사용자가 PR 1~7 모두 머지 후 mcc alias 갱신 (PR 3 안내)
2. 사용자가 새 mcc 시작 + `/develop-cycle 3` 호출
3. 본 메인이 1 cycle 진행 → ship → signal next_n=2 박제 → watch.sh fire (`/exit` + bash while loop) → 새 claude 시작 → /handoff load → /develop-cycle 2 자동 입력
4. 새 메인이 cycle 2 진행 (컨텍스트 fresh)
5. 동일 반복 → cycle 0 도달 시 watch.sh stop
6. dashboard 에서 3 cycle row 모두 success 확인

**검증 통과 시**: cycle 47+ = 본 사용자 N=50 자율 진행 진짜 검증. `/develop-cycle 50` 호출 후 자리 비움 = 실제 작동.

---

## 2. 위험 + mitigation

| Risk | Mitigation |
|---|---|
| Supabase URL/key 환경변수 미설정 | INSERT skip + watch.log warning. dashboard empty state |
| migration 023 prod 미적용 | R5 정신 — `supabase db push --linked` cycle 42 완료 시점 양쪽 박제 |
| mcc alias 변경 사용자 영역 의존 | TODOS.md 명확 안내 + 1 line 추가만 = 마찰 최소 |
| `/exit` 동작 검증 X | cycle 39 DRY_RUN 검증 + cycle 46 end-to-end 검증 |
| 50 cycle 진행 중 사용자 manual stop | signal next_n=0 박제 즉시 정상 stop |
| 다중 claude 환경 race | cycle 33 PPID chain 매칭 fix 박제 (이미 main 머지) |

## 3. 시점 + 이슈 추적

| Cycle | 예상 시점 | 박제 위치 |
|---|---|---|
| 39 | 다음 fresh 세션 | PR 1 + spec md |
| 40 | 동일 세션 또는 다음 | PR 2 |
| 41 | 짧음 (TODOS.md 수정만) | PR 3 |
| 42 | migration push 필요 (R5) | PR 4 |
| 43 | retro 안 INSERT 박제 | PR 5 |
| 44 | dashboard 기본 layout (가장 큼) | PR 6 |
| 45 | UX polish | PR 7 |
| 46 | verify-only retro | (PR 없음) |

cycle 39~45 = 7 PR. cycle 46 = end-to-end 검증. 총 8 cycle = N=50 시리즈의 ~16% 비중.

## 4. cycle 47~82 잔여 (자율 결정)

base + dashboard 구현 완료 후 자율 결정. 후보 영역:
- model 차원: v2.0 가중치 (운영 50+ 경기 누적 후) / 다른 종목 확장
- site 차원: 모바일 / 알림 / retention
- acquisition 차원: AdSense Publisher ID 발급 후 자연 (사용자 영역)
- meta 차원: skill-evolution (50 milestone trigger)

본 plan = expand-scope chain 의 cycle 39~46 영역만. cycle 47+ = 다음 사이클 자율 진단.

## 5. 본 cycle 38 박제 결과

- plan 본 파일 (290+ 줄)
- chain = expand-scope step 5 (writing-plans 마지막)
- 8 PR 단위 분할 + 검증 path 명시
- 다음 step = cycle 39 PR 1 (watch.sh socket 지원)
- N=50 carry-over: 잔여 44 cycle (cycle 39~82)
- expand-scope chain = 5 step 완료 (34 brainstorm → 35 ceo → 36 eng → 37 design → 38 writing-plans). cycle 39+ = 구현
