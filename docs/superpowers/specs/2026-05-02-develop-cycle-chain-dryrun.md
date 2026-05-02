# develop-cycle chain pool — Dry-Run Trace

**작성일**: 2026-05-02
**대상**: SKILL.md draft (`docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md`) 의 chain pool 6개 적용 조건 검증
**목적**: 사용자 영역 첫 fire 후 메인의 실제 chain 선택과 expected 비교 → 적용 조건 명확성 측정

## 시나리오 6개

각 시나리오 = 진단 결과 (key_findings) + chain pool table → expected chain.

### 시나리오 A — fix-incident

**key_findings**:
- "live-update cron 5/2 silent skip 발견 (사례 7 류)"
- "Sentry alert silent 차단 안 됨"

**Expected chain**: `fix-incident`

**Reason**: silent 실패 패턴 (CLAUDE.md 사례 6/7 류). investigate → ship 흐름이 자연.

### 시나리오 B — explore-idea

**key_findings**:
- "사용자 자연 발화: '머신러닝 도입해서 적중률 올려보자'"
- "신규 기능 idea, 구체적 spec 없음"

**Expected chain**: `explore-idea`

**Reason**: 새 product idea + 큰 방향 미정. office-hours brainstorm → ceo + eng 리뷰 → 구현 흐름.

### 시나리오 C — polish-ui

**key_findings**:
- "/analysis 페이지 모바일 layout 깨짐"
- "design 일관성 균열 (DESIGN.md 와 다른 컬러 사용)"

**Expected chain**: `polish-ui`

**Reason**: UI 이슈 + 디자인 부채. plan-design-review → design-review fix 흐름.

### 시나리오 D — review-code

**key_findings**:
- "packages/kbo-data/ 테스트 커버리지 60% (목표 80%)"
- "agents/debate.ts 복잡도 누적 (300+ 줄, 분리 가치)"

**Expected chain**: `review-code`

**Reason**: 코드 품질 / 테스트 부족. health → simplify → review 흐름.

### 시나리오 E — operational-analysis

**key_findings**:
- "지난 1주 적중률 평균 58% (목표 60%)"
- "Brier 0.245 (직전 주 0.231 보다 악화)"

**Expected chain**: `operational-analysis`

**Reason**: 운영 데이터 분석 + 적중률 metric. weekly-review → extract-pattern → compound 흐름.

### 시나리오 F — dimension-cycle (legacy default)

**key_findings**:
- "특별한 incident / idea / UI / 품질 / metric 없음"
- "정기적 site 차원 (LCP / CLS / 모바일) 점검 가치"

**Expected chain**: `dimension-cycle`

**Reason**: 위 5개 chain 어디에도 안 맞음. 기존 차원 dispatch (site / acquisition / model 자율) 폴백.

## 검증 방법 (사용자 영역 첫 fire 후)

1. tmux 안 `/develop-cycle 6` 호출 (6 사이클 = 6 chain 한 번씩 시뮬 가능)
2. 각 사이클 끝 후 `~/.develop-cycle/cycles/<n>.json` 확인
3. cycle_state.chain_selected + chain_reason 박제 확인
4. 위 시나리오와 비교 (메인 자율 추론이 expected 와 일치하나)
5. 일치 X → SKILL.md draft 의 chain pool 적용 조건 표현 보강 (다음 PR)
