# lesson-pending 23건 batch — hub D5 cron 주간 재발 패턴 wave 3 (cycle 434 + 669 lesson 후속, N=3 trigger)

**날짜**: 2026-06-01 (cycle 1095, fix-incident lite, lesson-pending sweep wave 3)
**유형**: 외부 요인 / 이미 resolved batch lesson 박제 (3번째 — N=3 trigger 도달)

## 관찰

cycle 1095 진단 시 lesson-pending label open issue **23건 누적** 발견 (#1457~#1479 range). 분류:

| 분류 | 건수 | fingerprint 예시 |
|---|---|---|
| `ci-main-*` | 13 | main branch CI flake 류 (build/test 일시 실패, PR 머지 자연 회복) |
| `ci-develop-cycle-*` | 5 | develop-cycle 자체 워크플로 실패 (Anthropic credit / API timeout / Vercel build flake) |
| `ci-autoplan-*` | 1 | autoplan retrospect 워크플로 실패 |
| `ci-test-c2-megamenu-*` | 2 | plan #14 megamenu test 실패 (plan #14 ship 이후 자연 회복) |
| `ci-fix-*` | 2 | shadow-row / backfill 류 commit CI 실패 (PR 머지 자연 회복) |

→ **23건 모두 stale**. 대응 PR 자연 머지 + main CI 자연 복구 완료. 워커 측 실 작업 X.

## N=3 trigger 도달 (cycle 434 + 669 + 1095 = 3회 동일 batch 패턴)

직전 2회 lesson 박제 정보:
- **cycle 434** (2026-05-15) — 15건 batch close (`2026-05-15-lesson-pending-batch-resolved-incidents.md`)
- **cycle 669** (2026-05-19) — 86건 batch close (`2026-05-19-lesson-pending-86-batch-recurring-hub-d5-limit.md`)
- **cycle 1095** (2026-06-01) — 23건 batch close (본 박제)

cycle 669 lesson 안 명시: "**N=3 도달 시 meta-pattern dispatch 자율 발화 후보**". 본 cycle 정확히 그 trigger.

## 재발 간격 분석

| 박제 cycle | 날짜 | 건수 | 직전 박제와 간격 |
|---|---|---|---|
| 434 | 2026-05-15 | 15 | 첫 박제 |
| 669 | 2026-05-19 | 86 | 4일 (235 cycle, batch 5.7×) |
| 1095 | 2026-06-01 | 23 | 13일 (426 cycle, batch 0.27×) |

13일 간격 — 직전 4일 간격 (cycle 669) 보다 길지만 영구 재발 패턴 유지. 86건 batch 급등 (cycle 669) 후 23건 batch (cycle 1095) = 본 메인 워커 활동 정상화 + hub D5 cron reminder 누적 시 자연 발생량 박제.

## 결론

**외부 요인 (이미 resolved) — batch close + N=3 meta-pattern dispatch**.

- 23건 모두 워커 측 PR 머지 + CI green 자연 회복 완료
- worker 측 실 작업 = batch close + 본 lesson 박제 + meta-pattern dispatch (영구 재발 패턴 evidence N=3)
- **영구 해결 = hub repo 측 `incident-followup.yml` workflow 수정 (사용자 결정 영역)**

## 박제 의무

1. 본 워커 측 `lesson:` commit 1건 = 23 fingerprint batch 박제 (본 markdown)
2. 워커 측 mass close 23 reminder issue (`gh issue close --comment "lesson-pending-wave-3-batch-close"`)
3. **`memory: meta-pattern hub-d5-cron-recurring-noise` dispatch** (N=3 trigger 충족)
4. **carry-over (hub 측, 사용자 결정 영역)**: `incident-followup.yml` D5 cron 개선 — 동일 fingerprint 의 closed worker issue 존재 시 신규 reminder 생성 skip OR 14일 이상 stale reminder 자동 close

## 후속 메타 패턴

cycle 434/669/1095 = 3회 박제 도달. **메타 패턴 evidence**:
- hub D5 cron reminder 재발은 워커 측 lesson 박제로 차단 불가능 (각 batch 마다 신규 reminder 누적)
- 워커 자율 영역 = batch close + lesson commit 박제 only (영구 cleanup 패턴화)
- 영구 해결 = hub repo 측 workflow logic 변경 (사용자 결정 영역, carry-over)

본 cycle 동시 `memory: meta-pattern hub-d5-cron-recurring-noise` commit 박제 → 사용자 가시 carry-over.
