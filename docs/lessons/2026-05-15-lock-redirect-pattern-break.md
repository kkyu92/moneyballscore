---
date: 2026-05-15
cycle: 472
chain: operational-analysis (lite)
subtype: meta-pattern
tags: [develop-cycle, lock, redirect, silent-drift, lint-rule]
---

# 2-chain lock 이 review-code 우세 streak 자연 break + prevention spec 전환 메커니즘

## 관찰 (cycle 458~471 14 cycle 운영 측정)

| cycle | chain | outcome | PR | 비고 |
|---|---|---|---|---|
| 458 | explore-idea (lite) | partial | — | spec carry-over |
| 459 | fix-incident (heavy) | success | #489 | |
| 460 | polish-ui (heavy) | success | #490 | |
| 461 | fix-incident (heavy) | success | #491 | ANTHROPIC credit incident |
| 462 | info-architecture-review (lite) | success | — | retro-only (30-cycle 주기) |
| 463 | polish-ui (heavy) | success | #492 | Telegram daily 라인 |
| 464 | review-code (heavy) | success | #493 | classifyVersion dedupe |
| 465 | review-code (heavy) | success | #494 | "모델 v1.6" 하드코딩 제거 |
| 466 | review-code (heavy) | success | #495 | agent helper dedupe |
| 467 | review-code (heavy) | success | #496 | /about HOME_ADVANTAGE 단일 source |
| 468 | review-code (heavy) | success | #497 | errMsg helper 41 곳 |
| 469 | review-code (heavy) | success | #498 | DEFAULT_WEIGHTS 라벨 |
| 470 | review-code (heavy) | success | #499 | /debug HOME_ADVANTAGE 단일 source |
| 471 | explore-idea (lite) | partial | — | 2-chain lock 발동 → prevention spec |

**ship rate**: 9/14 = 64.3% (PR 박제 cycle). review-code (heavy) 7 cycle SUCCESS streak (cycle 464~470) = silent drift family 자연 cleanup channel 화.

## lock 자동 break 작동 evidence

cycle 471 진단 단계:
- 직전 8 cycle distinct = 2 (review-code 7 + polish-ui 1)
- 2-chain alternation lock 룰 발동 (cycle 225 박제) → review-code + polish-ui cooldown N=1 제외
- 남은 pool 에서 improvement saturation 13/15 ≥ 12 = explore-idea trigger 충족
- lite mode 자율 redirect → silent drift family prevention spec 박제

cycle 472 진단 단계:
- 직전 8 cycle distinct = 2 (review-code 7 + explore-idea 1)
- lock 또 발동 → review-code + explore-idea cooldown N=1 제외
- 남은 pool 에서 operational-analysis (gap=23/25 임박) 자율 선택
- lite mode = lesson + retro 박제 (본 문서)

**lock 메커니즘 = success streak 도 break 가치 있음**: cycle 135 dominance-positive 인정 룰은 "streak 자체 자연 정상" 박제, lock 룰은 "streak 안에 누락된 차원 점검 강제". 두 룰 공존 = 단일 chain success streak 인정 + 8 cycle 누적 시 다른 차원 redirect 강제.

## 핵심 패턴 발견 — 사후 grep cycle 당 1 fix → lint rule batch 압력

review-code (heavy) 7 cycle streak 의 fix 패턴:
- 매 cycle 1 fix = 매직 넘버 / 라벨 / helper / token 단일 source 통합
- 발견 경로 = 본 메인 grep + Edit (사후 진단)
- 자동 차단 (사전 lint rule / CI grep) 부재

**lock 발동 후속 = prevention spec (cycle 471) 자연 발화**:
- scope A: 매직 넘버 ESLint rule (HOME_ADVANTAGE 등 P1)
- scope B: DEFAULT_WEIGHTS 라벨 자동 동기화 (P3)
- scope C: errMsg helper 강제 (P3)
- scope D: Tailwind color CI grep (P2)
- scope E: KST boundary 단일 source (P3)

**tradeoff**:
- 사후 grep cycle 당 1 fix: 매 cycle 박제 OK + ship rate 100% (7/7) + 하지만 N cycle 누적 시 lock
- 사전 lint rule batch: 1 PR 다수 fix + CI 통합 + 후속 silent drift 자동 차단 + 하지만 review-code chain 자연 trigger 감소

**다음 자율 redirect 후보 (cycle 473~)**:
- lock cooldown N=1 만료 후 explore-idea (heavy) — cycle 471 spec scope A 단일 PR 구현
- 또는 review-code (heavy) — 잔여 silent drift 새 발견 (model_version 'v1.8' 하드코딩 ModelVersionHistory.tsx:28 등 cycle 469 next 후보)
- 또는 fix-incident — gap=11/20 아직 below 이나 자연 incident 신호 시
- 또는 operational-analysis (heavy) — gap=23/25 → 다음 cycle 25-cycle 임계 도달 시 v1.8 W22 n=99+ 측정

## 핵심 인사이트

**lock 룰의 진짜 가치 = success 우세 chain 의 다른 차원 누락 자동 감지**. cycle 458~471 14 cycle 동안 8 cycle review-code (heavy) 만 = silent drift 단일 차원 cleanup. 다른 차원 (op-analysis gap=23, design-system 미발화, expand-scope 미발화, dimension-cycle 미발화) 자연 누락. lock 이 이 누락 차원 으로 redirect 강제.

**향후 chain 분포 자율 균형 관찰**: 다음 8 cycle (cycle 473~480) chain distinct ≥ 3 자연 회복 또는 또 review-code 우세 시 lint rule prevention spec 구현 시급도 ↑.

## 박제 위치

- 본 문서 = lesson 박제
- cycle_state JSON (cycles/472.json) = chain_selected + outcome + retro.summary
- 정책 commit (`policy:` prefix) = cycle 472 retro
