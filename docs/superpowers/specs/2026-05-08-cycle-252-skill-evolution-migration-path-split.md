# cycle 252 skill-evolution — SKILL.md 마이그레이션 path 분리 + 분석 범위 축소

**날짜**: 2026-05-08  
**trigger**: skill-evolution-pending 마커 (`79e246e`, cycle 250 retro) + trigger 5 (0회 발화 chain 5개)  
**자가 진화 회차**: 16회째

## 문제

cycle 251이 watch.sh 9005s에 kill됨 (CYCLE_HARD=9000s 연장됐음에도 초과).  
root cause: SKILL.md 마이그레이션 path 섹션의 단계 4 행이 cycles 124~230 전체 히스토리를 단일 테이블 셀에 압축 → 수천 자 단일 셀 edit 처리 시간 폭발.

동일 패턴: cycle 200 (3600s kill), cycle 209 (3600s kill), cycle 251 (9000s kill) — 매 fix마다 시간 연장했지만 근본 원인(SKILL.md 파일 크기) 해결 X.

## 갱신 영역 3건

### 1. SKILL.md 마이그레이션 path 분리 (핵심)

`~/.claude/skills/develop-cycle/MIGRATION-PATH.md` 신규 파일 생성.  
SKILL.md 마이그레이션 path 섹션 = compact 5행 요약만 (단계별 1줄).  
히스토리 전체는 MIGRATION-PATH.md에 이관.  
skill-evolution 갱신 시 MIGRATION-PATH.md에 append only — SKILL.md 마이그레이션 path 섹션 전체 rewrite 금지.

**효과**: SKILL.md edit 시 수천 자 단일 셀 처리 없어짐 → skill-evolution 완주 시간 대폭 단축.

### 2. 분석 범위 30 → 20 cycle

`분석 범위 강제 규칙`의 "직전 30 cycle JSON만 read" → "직전 20 cycle JSON만 read".  
마이그레이션 path 분리로 근본 해결됐으나 JSON read 측에서도 추가 축소.

### 3. 분석 범위 규칙 5번째 항목 추가

"SKILL.md 마이그레이션 path 갱신 시 MIGRATION-PATH.md에 append only" 명문화.

## 검증

- pnpm test: 220 tests PASS (3 tasks, 4.36s)
- SKILL.md: 616 lines (마이그레이션 path 단계 4 행 수천 자 → 1줄 compact)
- MIGRATION-PATH.md: 69 lines (전체 히스토리 보존)

## 예상 효과

다음 skill-evolution 시:
- SKILL.md edit: 수천 자 단일 셀 처리 없어짐
- 분석: 20 cycle JSON read (30에서 축소)
- 예상 소요 시간: 9000s → ~2000s 이내

## R5 메타 패턴 11번째 evidence

cycle 200 (3600s kill) → fix (watch.sh 연장) → cycle 209 (3600s kill) → fix (9000s 연장 + 30 cycle 범위 제한) → cycle 251 (9005s kill) → cycle 252 fix (마이그레이션 path 분리 + 20 cycle 범위 추가 축소).  
매 fix가 다음 layer 잔여 한계 노출 — 이번이 근본 원인(파일 내용 크기) 직접 해결 첫 사례.
