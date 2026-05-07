# Cycle 209 Fix — skill-evolution hard cap 초과 근본 해결

**박제 시점**: 2026-05-07 (cycle 209 interrupted 직후 분석)
**관련 cycles**: 200 (interrupted), 209 (interrupted)

## 증상

skill-evolution chain 실행 시 watch.sh hard cap(3600s = 60분) 초과 → SIGTERM/SIGKILL.

```
watch.log pattern (cycle 200, 209 동일):
  cpu_tenths=0~60 oscillation + children=0 전 구간
  → hard cap 3600s에 kill
  → cycle_state chain=unknown, outcome=interrupted
```

## 근본 원인 — "진짜 hang이 아님"

cycle 200에서 "hang"으로 진단했지만 cycle 209 데이터가 추가 증거 제공:

| 항목 | cycle 200 | cycle 209 |
|---|---|---|
| elapsed | 3604s | 3602s |
| cpu_tenths at kill | 19 | 0 |
| children at kill | 0 | 0 |
| 마지막 5분 CPU | 0~28% oscillation | 0~60% oscillation (여전히 활성) |

**children=0의 의미**:
- watch.sh의 `probe_activity()` = `pgrep -P $pid` (자식 프로세스 수)
- Bash 도구만 child process 생성 (git, gh, pnpm 등)
- Read / Write / Edit 내장 도구 = child process 없음
- 즉, children=0 = Claude가 Read/Edit/Write로 파일 작업 중 (Bash 미사용 단계)

**O(N) 스케일 문제**:
- skill-evolution 진단 단계: cycle JSON 파일 다수 read + SKILL.md 분석
- cycle 208 시점: cycle JSON 파일 200+개
- 전체 읽기 시도 → 60분 초과
- cycle 수가 늘수록 작업량 선형 증가

## 해결 (2가지)

### Fix 1: watch.sh CYCLE_HARD 연장 (즉각)

파일: `~/.develop-cycle/watch.sh`

```bash
# 추가된 변수
SKILL_EVOLUTION_HARD="${SKILL_EVOLUTION_HARD:-9000}" # 150m

# check_timeout() 안 hard cap 직전에 삽입:
local effective_hard="$CYCLE_HARD"
if [ -f "$DC_HOME/skill-evolution-pending" ]; then
  effective_hard="$SKILL_EVOLUTION_HARD"
  # 60~150분 구간 로그 출력
fi
if [ "$elapsed" -gt "$effective_hard" ]; then
  do_kill ... "hard cap ${effective_hard}s exceeded"
fi
```

**작동 원리**: skill-evolution-pending 마커가 있으면 hard cap을 60→150분으로 연장.
진짜 hang(AskUserQuestion + 사용자 부재)은 idle 누적기로 잡힘 (300s idle → kill).

### Fix 2: SKILL.md 분석 범위 제한 (구조적)

파일: `~/.claude/skills/develop-cycle/SKILL.md`

추가된 규칙:
- **직전 30 cycle JSON만 read** (오래된 cycle = 이전 skill-evolution에서 이미 반영)
- 전체 통계는 count + commit message로 집계 (JSON 전수 read 금지)
- SKILL.md "milestone 누적" 섹션 재read 금지 (이미 박제됨)

**효과**: O(N) → O(30) = 상수 시간 보장. cycle 수 아무리 늘어도 작업량 고정.

## 이전 fix와의 차이 (cycle 201)

| 구분 | cycle 200 fix (cycle 201) | cycle 209 fix (본 spec) |
|---|---|---|
| 진단 | /office-hours AskUserQuestion hang + Claude Max 한도 | O(N) 스케일 — 진짜 hang 아님, 작업량 > 60분 |
| fix | SKILL.md: /office-hours skip 강제 | watch.sh: 150분 cap + SKILL.md: 30 cycle 범위 제한 |

두 fix는 상호 보완:
- cycle 200 fix = AskUserQuestion 제거 → 진짜 hang 차단
- cycle 209 fix = 시간 연장 + 범위 제한 → O(N) 스케일 차단

## 검증 조건

다음 skill-evolution cycle에서:
1. watch.log에 `skill-evolution extended cap active` 로그 출력
2. children>0 (git/gh 실행) 시점 확인 → PR 생성 단계 도달 여부
3. outcome=success (PR 머지 + cycle_state 정상 박제)

## R5 메타 패턴 7번째 evidence

cycle 24 (hang safety v1) → 48 (warm-up race) → 53 (capture-pane) → 178 (handoff AskUserQuestion) → 200 (chain AskUserQuestion) → **209 (O(N) scale)**.

매 fix가 다음 layer 잔여 한계 노출. cycle 200 fix = "AskUserQuestion 제거" → 다음 layer = "작업량 자체 > 60분". 이제 fix 2개 중첩으로 skill-evolution 완주 가능성 높음.
