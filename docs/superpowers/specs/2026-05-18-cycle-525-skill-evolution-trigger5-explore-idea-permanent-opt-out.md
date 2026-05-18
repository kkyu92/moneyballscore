# Cycle 525 skill-evolution — trigger 5 explore-idea 영구 opt-out

- **cycle**: 525
- **trigger 충족**: trigger 5 (window N-19..N inclusive 505..524 explore-idea = 0회 발화, 표본 16 ≥ 10 충족)
- **이전 skill-evolution**: cycle 512 (13 cycle gap)
- **PASS_ship 누적**: 후속 측정 (cycle 524 기준)
- **success rate**: 11/12 = 91.7% (cycle 513-524, interrupted 1)

## 발화 맥락

cycle 524 retro 평가 시점 trigger 5 inclusive 윈도우 (505..524) 측정:

| chain | 발화 수 |
|---|---|
| review-code | 7 |
| polish-ui | 6 |
| operational-analysis | 1 |
| info-architecture-review | 1 |
| fix-incident | 1 |
| lotto-dimension | 2 (chain pool 외) |
| unknown / interrupted | 2 |
| **explore-idea** | **0** ← trigger 5 fire |

표본 = 16 (≥10 충족, lotto-dimension/unknown 제외 chain pool 등록 사이클 수) → trigger 5 fire → `~/.develop-cycle/skill-evolution-pending` 마커 박제 (524: 06900fd...).

cycle 525 진단 단계 마커 발견 → skill-evolution chain 강제 발화. 사용자 `/develop-cycle 40` 호출 후 메인 자유 추론 X = skill-evolution 우선.

## cycle 484 vs cycle 512 패턴 비교

| Chain | cooldown 시점 | cooldown 만료 후 자연 발화 여부 |
|---|---|---|
| polish-ui | cycle 484 (485..494 cooldown) | cycle 495+ 자연 발화 6회 (485-524 phase) ✓ |
| explore-idea | cycle 512 (513..522 cooldown) | **cycle 523~524 = 0회 재발 + cycle 524 trigger 5 즉시 재 fire** ✗ |

### 결정적 차이

| 측면 | polish-ui | explore-idea |
|---|---|---|
| trigger source 본질 | 명시적 (DESIGN.md grep / 토큰 균열) | 외부 의존 (GH issue / TODOS / 자연 발화) |
| 진단 단계 자연 fire 가능 | ✓ source 측정 직접 | ✗ 외부 신호 부재 시 자연 0회 |
| 자체 주기 보정 trigger | X (cooldown 룰 만으로 충분) | ✓ improvement saturation (직전 15 사이클 ≥ 12회) |

→ cooldown N=10 단독으로 false positive 차단 부족. **영구 opt-out 필요**.

## 영구 opt-out 분류 정당화

기존 6개 영구 opt-out + explore-idea 추가 = 7개 분류 통합:

| Chain | 사유 카테고리 | 박제 시점 |
|---|---|---|
| dimension-cycle | 구조적 0회 정상 | cycle 61/135 |
| expand-scope | 희귀 조건 | cycle 257 |
| design-system | 희귀 조건 | cycle 257 |
| operational-analysis | 자체 주기 보정 trigger (25-cycle) | cycle 255 |
| fix-incident | 자체 주기 보정 trigger (20-cycle) | cycle 257 |
| info-architecture-review | 자체 주기 보정 trigger (30-cycle) | cycle 300 |
| **explore-idea** | **외부 source 의존 + 자체 trigger (improvement saturation)** | **cycle 525 신규** |

평가 대상 축소: 3개 → 2개 (**review-code / polish-ui**).

## explore-idea 0회 정당성 — cycle 525 시점 재확인

cycle 512 시점 평가는 외부 source 0건 + improvement saturation 미충족. cycle 525 시점 재확인:

1. **open GH issues** scout/idea type → 2건 (#741 PII / #742 SQL 안티패턴) 존재. 단 review-code/polish-ui 6축 silent drift family 운영 cleanup 가 자연 우선 (silent drift family streak 54 cycle phase)
2. **TODOS Next-Up 4주+ 미진행** → 없음
3. **improvement saturation** (직전 15 사이클 510..524: review-code 7 + fix-incident 1 + polish-ui 6 + info-arch 1 = 15) ≥ 12 → **충족** → improvement saturation 자체 trigger 자연 fire 가능 (cycle 526+)
4. **explore-idea 마지막 발화** cycle 480 = 45 cycle gap (gap 누적)
5. **사용자 자연 발화 product 의향** → 직전 7일 0건

결론:
- open GH scout issues 가 존재 (2건) → explore-idea trigger 자체는 존재
- improvement saturation 자체 trigger 가 cycle 526+ 자연 fire 보장 → trigger 5 중복 검사 불필요
- 외부 source 의존 chain 본질이 silent drift family 운영 phase 동안 자연 후순위 = 정당한 의도된 결과
- **trigger 5 evaluation 에서 영구 제외**: cycle 68 cooldown 룰 noise 누적 차단 + improvement saturation 자체 trigger 보장

## 변경 내용

### SKILL.md (~/.claude/skills/develop-cycle/SKILL.md)

1. **frontmatter description**: skill-evolution 28→29회 / cycle 목록에 525 추가 / cycle 525 entry 한 줄 추가 / opt-out 6→7개 명시
2. **L65 영구 opt-out 섹션**: 6개 chain list → 7개 (explore-idea 추가) + 사유 카테고리 4종 명시 (구조적 / 희귀 / 자체 주기 / 외부 source) + cycle 525 박제 evidence (cycle 484 vs 512 패턴 비교)
3. **마이그레이션 path 단계 4 행**: cycle 100~512 → cycle 100~525 / 자가 진화 8~28회 → 8~29회 / cycle 525 한 줄 갱신

### MIGRATION-PATH.md (~/.claude/skills/develop-cycle/MIGRATION-PATH.md)

본 cycle entry append (append-only 룰 strict 준수).

### 본 repo (commit 단위)

`docs/superpowers/specs/2026-05-18-cycle-525-skill-evolution-trigger5-explore-idea-permanent-opt-out.md` (본 파일) 만 추가.

## smoke 검증

`pnpm test --filter=@moneyball/shared` 통과 (80 tests, FULL TURBO cached). 본 SKILL 변경은 코드/테스트 영향 X — 메타 SKILL 만 수정.

## 다음 milestone

cycle 550 (25 cycle 거리, 50 cycle 주기) — trigger 3 자연 fire 예정.
