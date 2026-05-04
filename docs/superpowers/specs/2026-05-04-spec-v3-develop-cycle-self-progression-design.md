# spec_v3 — develop-cycle dashboard DESIGN review (cycle 37, expand-scope step 4)

**일자**: 2026-05-04
**Cycle**: 37 (chain=expand-scope, step 4: `/plan-design-review` 자율)
**Base**: spec_v2 (cycle 36)
**Status**: spec_v3 박제 (사용자 자리 비움, 본 메인 자가 진행)
**다음 step**: cycle 38 (`/superpowers:writing-plans` → plan.md)

---

## 0. design 모드 = dashboard UX + DESIGN.md 일치 + 정보 hierarchy

spec_v2 의 dashboard cherry-pick 영역. `/debug/develop-cycle` page 의 디자인 정제. DESIGN.md 의 dark green + gold 팔레트 + Pretendard + Geist Mono 일관성 + 기존 `/debug/*` 패턴 재사용.

---

## 1. DESIGN.md 일치 검토

### 1.1 색감 (DESIGN.md 박제)
- background: dark green (#0a1f0a 류)
- accent: gold (#d4a574 류)
- text: white / gray
- success: green / fail: red / pending: gold

dashboard 도 동일. 새 색감 도입 X.

### 1.2 타이포
- 제목: Pretendard 800
- 본문: Pretendard 400
- 데이터 (cycle_n / chain count / PR num): Geist Mono tabular-nums

### 1.3 기존 `/debug/*` 패턴 재사용

| Page | 패턴 |
|---|---|
| `/debug/pipeline` | 30일 cron 운영 grid + status badge + filter |
| `/debug/hallucination` | 일자별 추세 + agent 분리 + 비율 |
| `/debug/model-comparison` | side-by-side 모델 비교 |
| `/debug/factor-correlation` | scatter + 회귀 |
| `/debug/reliability` | calibration curve |

→ `/debug/develop-cycle` = 시리즈 시간 grid (cycle_n) + status badge + chain 분포 + watch.log tail. 기존 패턴 자연 follow.

---

## 2. 정보 hierarchy

### 2.1 page 구조 (5 section, 위→아래)

```
┌─────────────────────────────────────────────────────┐
│  Header: develop-cycle 자율 진행 dashboard           │
│  ├ 현재 cycle / chain / 진행 시간                   │
│  ├ 잔여 cycle (signal next_n)                       │
│  └ refresh button (수동, auto-refresh 30s)          │
├─────────────────────────────────────────────────────┤
│  Section 1: 현재 상태 (large card)                   │
│  ├ 활성 cycle_n + chain_selected + elapsed time     │
│  ├ active-cycle PID alive ✓ / stale ✗               │
│  └ signal status: OK / FAIL / 부재                   │
├─────────────────────────────────────────────────────┤
│  Section 2: 최근 cycles (table, 20 row)              │
│  ├ cycle_n / chain / outcome / pr / 박제 시각        │
│  ├ outcome badge: success ●green / fail ●red /      │
│  │   partial ●yellow / interrupted ●orange          │
│  └ pr 클릭 시 GitHub PR 새 탭                       │
├─────────────────────────────────────────────────────┤
│  Section 3: chain 분포 (horizontal bar chart)        │
│  ├ 9 chain pool (fix-incident / explore-idea / ...) │
│  ├ 막대 = 누적 발화 횟수                            │
│  ├ 막대 색 = chain 별 (가독성)                      │
│  └ 0회 발화 chain = 회색 + "0회" 텍스트             │
├─────────────────────────────────────────────────────┤
│  Section 4: outcome 추세 (sparkline, 30 cycle)       │
│  ├ x = cycle_n, y = success/fail binary             │
│  └ 누적 success rate (%)                            │
├─────────────────────────────────────────────────────┤
│  Section 5: watch.log tail (50 line)                 │
│  ├ 진한 흑 background + Geist Mono                  │
│  ├ "TIMEOUT_KILL" 빨강 + "fired" 노랑               │
│  └ scroll bottom anchor                             │
└─────────────────────────────────────────────────────┘
```

### 2.2 데이터 우선순위

| 우선 | 정보 | 사용자 가치 |
|---|---|---|
| 1 | 현재 cycle 진행 상황 | "지금 뭐 하고 있어?" — 사용자 즉시 궁금 |
| 2 | 최근 cycles 결과 | "방금까지 뭐 했어?" — 누적 진행 review |
| 3 | chain 분포 | "어떤 영역 작업?" — meta 가시성 |
| 4 | outcome 추세 | "잘 되고 있어?" — 신뢰도 |
| 5 | watch.log tail | "문제 있으면 추적" — debug |

---

## 3. 모바일 layout

dashboard = 사용자가 자리 돌아왔을 때 빠르게 review. **모바일 access 자연** (사용자가 외출 중 핸드폰 확인).

### 3.1 breakpoint
- < 640px (mobile): section vertical stack, table → card list
- 640~1024px (tablet): section vertical stack, table 2 col
- > 1024px (desktop): 위 grid layout

### 3.2 모바일 우선 정보
- header (현재 cycle + 잔여 cycle) = 항상 sticky top
- 최근 cycles = card list (cycle_n + chain + outcome badge 만)
- 다른 section = collapse (탭)

---

## 4. 인터랙션

### 4.1 auto-refresh
- 30초마다 client-side fetch + 데이터 갱신
- toggle 버튼 (사용자 자리 비움 시 끔 권장 = 배터리 보호)

### 4.2 cycle row 클릭
- 모달 또는 새 탭 = cycle_state.json 전체 view (raw JSON + formatted)

### 4.3 PR 링크
- GitHub PR 새 탭. `https://github.com/kkyu92/moneyballscore/pull/<num>`

### 4.4 watch.log 검색
- mobile = 생략. desktop = 간단 input (text contains)

---

## 5. UX detail

### 5.1 outcome badge 색
- success: `bg-green-700/30 text-green-400` (DESIGN.md dark green 일관성)
- fail: `bg-red-700/30 text-red-400`
- partial: `bg-yellow-700/30 text-yellow-400`
- interrupted: `bg-orange-700/30 text-orange-400`

### 5.2 chain 분포 막대 색
9 chain pool 별 hue 분리 (DESIGN.md 의 gold accent 1개 + 8 보조색). 시각 노이즈 X — 회색 base + accent 만.

### 5.3 데이터 부재 처리
- recent cycles 0 건: "아직 cycle 박제 X" + 첫 cycle 시작 안내
- chain 분포 모두 0회: "데이터 누적 중"
- watch.log tail empty: "watcher 정상 동작 중 (event 없음)"

### 5.4 BASIC auth
- 기존 `/debug/*` 패턴 동일. `BASIC_AUTH_USER` + `BASIC_AUTH_PASS` 환경변수
- middleware level 처리. unauthenticated → 401

---

## 6. 데이터 source 명시 (eng spec_v2 와 align)

| 정보 | source | 갱신 |
|---|---|---|
| 현재 cycle | `~/.develop-cycle/active-cycle` (사용자 로컬) | API route 가 file 직접 read X |
| 잔여 cycle | `~/.develop-cycle/signal` next_n | 동일 |
| 최근 cycles | Supabase `develop_cycle_logs` | 매 retro INSERT |
| chain 분포 | Supabase aggregate | 동일 |
| outcome 추세 | Supabase select cycle_n + outcome | 동일 |
| watch.log tail | Supabase `develop_cycle_logs.cycle_state.watch_log_tail` (cycle 36 schema 추가) | 동일 |

**중요**: dashboard server (Vercel) 는 사용자 로컬 file access X. **Supabase 가 단일 데이터 source**. cycle 36 spec 의 schema 가 watch_log_tail 박제 보장.

**현재 cycle / 잔여 cycle** 은? Supabase 에 박제 시점 = 매 cycle retro 끝. 즉 **현재 진행 중 cycle 은 Supabase 에 X** (retro 후만 박제).

해결: 매 cycle 진단 단계 첫 step (`active-cycle 박제`) 에서도 Supabase 에 진행 시작 INSERT (status=in_progress). retro 끝에서 UPDATE (outcome 박제). 즉 cycle row 가 in_progress → success/fail.

이 변경 = spec_v2 schema 보강. cycle 38 writing-plans 에서 명시.

---

## 7. spec_v3 결정 + 후속 step

### 7.1 spec_v2 + design 정제

| 영역 | spec_v2 | spec_v3 추가 |
|---|---|---|
| dashboard layout | 5 section 명시 | UI hierarchy + 색감 + Pretendard/Geist Mono + 모바일 layout |
| schema | retro 끝 INSERT | + 진단 첫 step INSERT (status=in_progress) + retro UPDATE |
| 인터랙션 | (정의 X) | auto-refresh / row 클릭 / PR 링크 / 검색 |
| BASIC auth | (정의 X) | 기존 `/debug/*` middleware 재사용 |
| 데이터 부재 처리 | (정의 X) | empty state 3 case |

### 7.2 후속 step

cycle 38 writing-plans = 위 모든 spec (v0~v3) 종합 → 구현 plan.md. 단계별 PR 분할 + 검증 path + 시기.

---

## 8. 본 cycle 37 박제 결과

- spec_v3 본 파일 (240+ 줄)
- chain = expand-scope step 4 (design-review)
- 결정 = DESIGN.md 일관성 + 5 section hierarchy + 모바일 우선 + Supabase 단일 source + in_progress/완료 양 상태
- 다음 step = cycle 38 writing-plans → plan.md
- N=50 carry-over: 잔여 45 cycle (cycle 38~82)
