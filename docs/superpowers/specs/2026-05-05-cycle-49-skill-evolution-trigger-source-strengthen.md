# cycle 49 — skill-evolution: 0회 발화 chain trigger source 강화

**Cycle**: 49
**Date**: 2026-05-05
**Chain**: skill-evolution (자동 발화, 메인 자율 X)
**Predecessor**: cycle 46 skill-evolution-46 (fix-incident chain stop 강화) + cycle 47 박제 마커 (b57a619)

## 배경

직전 20 사이클 (29~48) chain 발화 분포:

| chain | 발화 수 |
|---|---|
| fix-incident | 10 |
| expand-scope | 5 |
| review-code | 3 |
| operational-analysis | 1 |
| skill-evolution | 1 |
| **explore-idea** | **0** |
| **polish-ui** | **0** |
| **dimension-cycle** | **0** |
| **design-system** | **0** |

→ 9 chain 중 4 chain 0회 발화 (44%). 직전 20 cycle distinct chain count = 5/9 (55%).

**SKILL.md 단계 4 회고 trigger #5 충족 조건** ("직전 20 사이클 동안 chain pool 의 chain 1개가 0회 발화") = 이 분포 박제. cycle 47 retro 가 마커 박제 (`~/.develop-cycle/skill-evolution-pending` content "47: b57a619...", mtime 2026-05-04 23:11:52). cycle 48 가 사용자 명시 fix-incident (B 옵션) 로 마커 처리 skip → cycle 49 발화.

## 진단 — 0회 발화의 원인

| chain | 0회 원인 (가설) |
|---|---|
| explore-idea | trigger 정의 모호 ("신규 기능 / 큰 방향 미정 / 자연 발화 새 product idea") — 진단 단계서 자동 매핑 X. open GH issue 라벨/키워드 매핑 약함 |
| polish-ui | trigger ("작은 UI 이슈 / 디자인 부채 / 디자인 일관성 균열") 도 모호. DESIGN.md vs 컴포넌트 grep 자동화 명령 부재 |
| dimension-cycle | "위 어디에도 안 맞음" = 사실상 fallback. 본 fallback 호출 자체가 자연스럽지 않음 (다른 chain 모호 시 fix-incident 우선 매핑) |
| design-system | trigger 5개 중 자동 측정 가능한 것 ≤ 1 (DESIGN.md mtime). 사용자 발화 의존성 강함 |

**공통 패턴**: trigger 가 자동 측정 X 또는 진단 source table 매핑 약함 → fix-incident 가 가장 안전한 fallback 으로 흡수.

## 갱신 영역 — 3건

### 갱신 1: chain pool table trigger 정의 강화 (line 32-38)

**explore-idea**:
- 현재: 신규 기능 / 큰 방향 미정 / 자연 발화 새 product idea
- 갱신: + GH issues body 에 `feature` / `idea` / `scope-expand` / `enhancement` 키워드 + 직전 5 사이클 모두 fix-incident only 누적 + TODOS.md "Next-Up" 항목 4주+ 미진행

**polish-ui**:
- 현재: 작은 UI 이슈 / 디자인 부채 / 디자인 일관성 균열 (시스템 레벨 X)
- 갱신: + DESIGN.md token (color/spacing) vs 실제 컴포넌트 grep diff + 사용자 자연 발화 design 신호 ("어색", "이상", "안 예뻐", "polish") + Sentry 클라이언트 UI 에러 패턴

**dimension-cycle (legacy default)**:
- 현재: 위 어디에도 안 맞음
- 갱신: legacy fallback 명시 + 직전 5 사이클 모두 진단 source 균형 trigger 충족 X 일 때만 발화. ambiguous trigger 시 fix-incident 우선 (현재 default 동작) 유지

**design-system (메인 자율)**:
- 현재 5 trigger: DESIGN.md ≥4주 / 새 area / 발화 / meta-pattern / DESIGN.md vs grep
- 갱신: 진단 source table 명시 + DESIGN.md mtime 자동 측정 명령 추가 (`stat -f %m DESIGN.md`) + 사용자 발화 키워드 명시 + chain 매핑 자연 X 일 때 진단 단계서 우선 검토

### 갱신 2: 진단 source table 에 4 chain 추가 (line 167-178)

현재 table 5 chain (fix-incident / explore-idea / polish-ui / review-code / operational-analysis / dimension-cycle). expand-scope / design-system / skill-evolution 누락.

추가 행:
```
| `expand-scope` | open GH issues (label `hub-dispatch` + architecture/refactor/redesign/scope 류) / TODOS.md "큰 방향" 4주+ 미진행 / 직전 4 사이클 small fix only / meta-pattern 누적 |
| `design-system` | DESIGN.md mtime ≥4주 / 새 area design spec 부재 (`docs/design/<area>.md`) / 사용자 design 발화 / `meta-pattern` = "design chain 0회 N 사이클" / DESIGN.md vs 컴포넌트 grep |
| `skill-evolution` | 본 사이클 시작 시 `~/.develop-cycle/skill-evolution-pending` 마커 부재 (트리거 평가는 단계 4 회고 시점) |
```

### 갱신 3: 단계 1 진단 첫 step 룰 추가

skill-evolution 마커 부재 + open issue 부재 시 진단 단계 추가:

```bash
# 직전 20 사이클 chain 발화 분포 측정 (chain 균형 자가 진단)
for n in $(seq $(($CYCLE_N - 20)) $(($CYCLE_N - 1))); do
  python3 -c "import json; print(json.load(open('/Users/kyusikkim/.develop-cycle/cycles/$n.json'))['chain_selected'])" 2>/dev/null
done | awk '{print $1}' | sort | uniq -c | sort -rn
```

0회 발화 chain 1+ 개 발견 시 그 chain trigger 우선 검토 명시. 진단 source 매핑 자연 X 시 dimension-cycle fallback. 매핑 자연 시 그 chain 발화 (예: explore-idea 발화).

## 효과 검증

- 본 갱신 적용 후 cycle 50+ 진단 단계서 0회 발화 chain trigger 자동 우선 검토
- 효과 지표: 다음 20 cycle (49~68) distinct chain count ≥ 7/9 (현재 5/9 = +2)
- 회귀 차단: dimension-cycle fallback 명시화 = legacy 의존 감소
- meta-pattern dispatch (memory: subtype=meta-pattern) 변경 diff 박제 → 다음 skill-evolution 후보 carry-over

## 잔여 한계

1. **0회 발화 chain trigger 가 사용자 입력 의존성** — open GH issue 라벨 (hub-dispatch) 사용자 박제 의존, 본 메인 자율 발화 trigger 약함
2. **design-system / explore-idea = 큰 작업** — 사용자 N=2~3 사이클 부담 가능. 본 갱신은 trigger 강화만, 시퀀스 경량화 X
3. **R5 룰 적용** — 본 cycle 자체 = isolated smoke (lint 통과) + 사용자 자연 발화 검증 (cycle 48 partial outcome 박제 + 마커 발화 의무 = 본 갱신 정당화) + 실측 fire = cycle 50+ 적용 시점
4. **chain trigger 강화 ≠ chain 발화 보장** — 본 갱신 후에도 진단 source 자체가 0건이면 (예: GH issue 라벨 박제 안 하면) 발화 X. 다음 skill-evolution 후보 = 진단 source 자체 보강 또는 사용자 자연 발화 채널 추가

## 마이그레이션 path

| 단계 | 시점 | 동작 |
|---|---|---|
| 0 | 본 PR 머지 직후 | chain pool table + 진단 source table + 단계 1 룰 즉시 적용 |
| 1 | cycle 50+ 진단 시 | 0회 발화 chain 4개 trigger 우선 검토. 매핑 자연 시 그 chain 발화 |
| 2 | cycle 50~68 (20 cycle) | distinct chain count metric 측정. 7/9 도달 = 본 갱신 진짜 PASS 박제 (R5 룰) |
| 3 | cycle 50~68 누적 후 trigger #5 재평가 | 충족 (예: 또 4 chain 0회) 시 다음 skill-evolution 발화 — 진단 source 자체 보강 후보 |

## 검증 신호

- **isolated smoke**: lint clean (FULL TURBO) — pnpm lint 통과
- **실측 fire (R5 진짜 검증)**: cycle 50+ 진단서 0회 발화 chain trigger 자동 우선 검토 + 1+ 회 발화 — pending
- **사용자 자연 발화**: cycle 47/48 retro 의 next_recommended (= 0회 발화 chain trigger 강화) 일치 = 본 cycle 49 갱신 정당화

## 박제 위치

- spec: `docs/superpowers/specs/2026-05-05-cycle-49-skill-evolution-trigger-source-strengthen.md` (본 파일)
- SKILL.md: `~/.claude/skills/develop-cycle/SKILL.md` (사용자 영역, 직접 Edit, repo 외부)
- branch: `develop-cycle/skill-evolution-49`
- PR: TBD (`feat(skill): cycle 49 — skill-evolution 0회 발화 chain trigger source 강화`)
- meta-pattern dispatch: 변경 diff (chain pool table + 진단 source table + 단계 1 룰)
- 마커 삭제: chain 끝 시점 `rm ~/.develop-cycle/skill-evolution-pending`
