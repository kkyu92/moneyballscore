# spec_v1 — develop-cycle 자동 진행 재설계 + CEO SCOPE EXPANSION (cycle 35, expand-scope step 2)

**일자**: 2026-05-04
**Cycle**: 35 (chain=expand-scope, step 2: `/plan-ceo-review` SCOPE EXPANSION 자율)
**Base**: spec_v0 (cycle 34, `2026-05-04-spec-v0-develop-cycle-self-progression.md`)
**Status**: spec_v1 박제 (사용자 자리 비움, 본 메인 SCOPE EXPANSION 자가 진행)
**다음 step**: cycle 36 (`/plan-eng-review` → spec_v2)

---

## 0. CEO 모드 = SCOPE EXPANSION 자율

spec_v0 wedge = 옵션 A (mcc alias bash wrapper + watch.sh socket 지원). 본 cycle 35 = SCOPE EXPANSION 자율 모드 — 더 야심찬 product 가치 검토 후 spec 정제.

질문: spec_v0 의 fix 가 본 사용자 1명 영역의 1회성 작업인가? 아니면 더 큰 product 가치?

---

## 1. 4 모드 평가

### Mode A: SCOPE EXPANSION (dream big)

**확장 옵션**:

#### EXPANSION-1: develop-cycle skill 일반화 + open source
- 본 사용자 1명의 50 cycle 자율 진행 = case study
- skill 을 일반 공개 → claude code dev community 의 모든 사용자가 자기 프로젝트에 활용
- 새 패러다임: AI agent + tmux + signal file = 사용자 자리 비움 동안 프로젝트 자율 진화

**가치**: 매우 큼. claude code dev experience 의 새 paradigm.
**비용**: 매우 큼. 일반화 = 다양한 dev 환경 지원 + 문서 + 커뮤니티 + 장기 maintenance.
**시점**: cycle 50+ 본 사용자 환경 검증 충분 후 자연.

#### EXPANSION-2: claude code 다른 skill 도 자율 진행
- ship / qa / debug / health 등 다른 skill 도 동일 fire 메커니즘 활용
- 사용자가 `/qa 50` 호출 후 자리 비움 → 본 메인이 50 회 QA 자율 진행

**가치**: 큼. 단 본 사용자 영역에서는 사용 case 적음 (qa 50 회 = 큰 codebase).
**비용**: 중. skill 별 fire 시퀀스 설계 + carry-over 정의.
**시점**: develop-cycle skill 검증 후. 자연 follow.

#### EXPANSION-3: multi-claude 협업 (병렬 cycle)
- 다중 claude 환경에서 각 claude 가 다른 차원 cycle 동시 진행
- 예: claude #1 = model 차원 cycle, claude #2 = site 차원 cycle, claude #3 = acquisition 차원 cycle
- 본 cycle 33 PPID chain fix 가 multi-claude race 방지 = 병렬 진행 인프라 first step

**가치**: 큼. 병렬 = 진행 속도 N 배.
**비용**: 매우 큼. 차원 간 conflict 해소 / git branch 충돌 / DB 동시 쓰기 / R7 자동 머지 race.
**시점**: cycle 100+ 단일 claude 자율 진행 검증 충분 후. 매우 후행.

#### EXPANSION-4: 모든 사용자 skill 활용 dashboard
- 사용자 자리 비움 동안 본 메인이 진행한 cycle 들 + spec/plan 박제 + PR 박제 + retro 박제 = 사용자가 돌아왔을 때 한 화면 dashboard
- 진행 상황 / 결정 / 근거 가시화 → 사용자 trust 보장

**가치**: 매우 큼. 본 사용자 화남 = 진행 상황 가시성 부족이 직접 원인. dashboard = 사용자 confidence 가드.
**비용**: 중. 기존 ~/.develop-cycle/cycles/*.json + git log + PR list 종합 web UI.
**시점**: cycle 39+ 구현 단계와 자연 매핑 가능.

---

### Mode B: SELECTIVE EXPANSION (hold scope + cherry-pick)

본 메인 추천 = **Mode B**. base scope (spec_v0 wedge 옵션 A) 유지 + 가장 가치 높은 확장 1~2 cherry-pick:

| 확장 | 가치 | 비용 | cherry-pick? |
|---|---|---|---|
| EXPANSION-1 (open source) | 매우 큼 | 매우 큼 | ❌ (cycle 50+ 자연) |
| EXPANSION-2 (다른 skill 일반화) | 큼 | 중 | ❌ (자연 follow) |
| EXPANSION-3 (multi-claude 병렬) | 큼 | 매우 큼 | ❌ (cycle 100+ 자연) |
| **EXPANSION-4 (dashboard)** | 매우 큼 | 중 | ✅ |

**선택 이유**: 본 사용자 화남 = 진행 상황 가시성 부족. dashboard = **사용자 confidence 가드** = 자율 진행의 trust 인프라. base fix (옵션 A) 만 으로는 사용자가 또 자리 비움 후 돌아왔을 때 진행 결과 빨리 못 봄 → 같은 화남 재발 가능.

dashboard = 본 사이클 즉시 가치 + 일반화 후속 cycle 자연.

---

### Mode C: HOLD SCOPE (rigor)

base scope (옵션 A) 만 + 모든 확장 후행. 가치: 빠른 ship + 검증.
단점: 본 사용자 화남 재발 위험 (가시성 갭).

### Mode D: SCOPE REDUCTION

base scope 축소 옵션:
- 옵션 A 의 mcc alias 변경 부분만 → 사용자 영역 manual install 자연 트리거
- watch.sh socket 지원 + active-cycle 자동 감지는 후행

가치: 매우 빠른 ship.
단점: 본 메인이 fire 메커니즘 부분 fix 자연 자기 영역 미실행 → 사용자 manual 비중 그대로.

---

## 2. spec_v1 결정 = Mode B (SELECTIVE EXPANSION)

### 2.1 base scope 유지 (spec_v0 옵션 A)

- mcc alias 변경 (사용자 영역 1 line)
- watch.sh socket+target 지원
- active-cycle 박제 시 socket+target 자동 감지
- fire 시퀀스 변경 (`/exit` + bash while loop)

### 2.2 cherry-pick = EXPANSION-4 dashboard

**구체화**:

#### 2.2.1 dashboard 위치
- repo 안 `apps/moneyball/src/app/debug/develop-cycle/page.tsx` (BASIC auth, 사용자만)
- 또는 별도 `~/.develop-cycle/dashboard.html` (오프라인 file)

추천: **repo 안 `/debug/develop-cycle`**. 기존 `/debug/pipeline`, `/debug/hallucination` 패턴 일관성 + Vercel 배포로 어디서든 access (모바일 포함).

#### 2.2.2 dashboard 정보 5개

| Section | 데이터 source |
|---|---|
| **현재 cycle** | `~/.develop-cycle/active-cycle` + `~/.develop-cycle/signal` |
| **최근 cycles** | `~/.develop-cycle/cycles/*.json` (마지막 20) |
| **chain 분포** | cycles/ 의 chain_selected count |
| **PR 박제** | `cycles[*].pr_number` + GitHub PR API |
| **watch.log** | `~/.develop-cycle/watch.log` 마지막 50 line |

#### 2.2.3 데이터 sync
- `~/.develop-cycle/` 은 사용자 로컬 = Vercel 서버 access X
- 옵션: API route 가 ssh 또는 (사용자 영역 cron) 으로 데이터 push to Supabase 또는 Blob
- 또는 dashboard 가 사용자 로컬 file:// 직접 read (오프라인 mode)

추천 단순 path: 매 cycle retro 끝에서 `cycle_state.json + watch.log tail` 을 Supabase `develop_cycle_logs` 테이블 INSERT. dashboard = Supabase select.

### 2.3 후속 step 갱신

| Cycle | step | 결과물 |
|---|---|---|
| 36 | `/plan-eng-review` | spec_v2 (architectural risk + dashboard schema) |
| 37 | `/plan-design-review` | spec_v3 (dashboard UX + 색감 + 정보 hierarchy) |
| 38 | `/superpowers:writing-plans` | plan.md (단계별 구현 분할) |
| 39 | watch.sh socket 지원 (구현) | PR 1 |
| 40 | SKILL.md active-cycle 자동 감지 (구현) | PR 2 |
| 41 | mcc alias 안내 (사용자 영역 명시) | TODOS.md 갱신 |
| 42 | Supabase migration (`develop_cycle_logs` 테이블) | PR 3 |
| 43 | 매 cycle retro 끝 Supabase INSERT (구현) | PR 4 |
| 44 | `/debug/develop-cycle` dashboard (구현) | PR 5 |
| 45+ | 검증 + 잔여 자율 결정 | — |

---

## 3. SCOPE EXPANSION 결정 근거

### 3.1 사용자 즉시 가치
- base scope (옵션 A) = 50 cycle 자율 진행 메커니즘 fix
- dashboard = 사용자가 자리 돌아왔을 때 진행 상황 빠른 review (현재 cycle 33 같은 화남 재발 차단)

### 3.2 product 일반화 가치
- dashboard 자체가 다른 skill / 다른 사용자 / open source 일반화의 first step
- EXPANSION-1 (open source) 의 case study material = dashboard 스크린샷

### 3.3 cost-benefit
- base scope = ~5 PR (cycle 39~43)
- dashboard cherry-pick = +2 PR (cycle 44~45) = ~40% 추가 비용
- 사용자 trust 가치 = 매우 큼. cost 정당화

---

## 4. 본 cycle 35 박제 결과

- spec_v1 본 파일 (220+ 줄)
- chain = expand-scope step 2 (ceo-review SCOPE EXPANSION)
- 결정 = Mode B (SELECTIVE EXPANSION) — base scope 유지 + dashboard cherry-pick
- 다음 step = cycle 36 eng-review → spec_v2 (architectural risk + dashboard schema)
- N=50 carry-over: 잔여 47 cycle (cycle 36~82)

본 spec_v1 = spec_v0 위에 사용자 trust 인프라 (dashboard) cherry-pick. cycle 36~38 sub-skill review 가 spec 정제 + cycle 39+ 구현 = 진짜 자율 진행 + 가시성 보장.
