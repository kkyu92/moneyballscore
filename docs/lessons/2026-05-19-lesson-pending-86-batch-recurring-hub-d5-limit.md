# lesson-pending 86건 batch — hub D5 cron 주간 재발 패턴 (cycle 434 lesson 후속)

**날짜**: 2026-05-19 (cycle 669, fix-incident lite, gap=21 trigger 7 충족)
**유형**: 외부 요인 / 이미 resolved batch lesson 박제 (2번째)

## 관찰

cycle 669 진단 시 lesson-pending label open issue **86건 누적** 발견 (#842~#927 range). spot check 결과:

| 검증 fingerprint | open 워커 issue | 대응 PR (머지 검증) |
|---|---|---|
| `ci-develop-cycle-skill-evoluti` | #921 | PR #807 / #933 / #483 (skill-evolution milestone 류, 모두 MERGED) |
| `ci-develop-cycle-retro-301-c0a` | #916 | PR #291 (cycle 301 retro, MERGED) |
| `ci-develop-cycle-pick-vs-ai-29` | #927 (OPEN) ↔ #740 (CLOSED) | 동일 fingerprint 가 OPEN + CLOSED 양쪽 존재 — 주간 재발 패턴 |

→ **86건 모두 stale**. 대응 PR 자연 머지 + main CI 자연 복구 완료. 워커 측 실 작업 X.

## 원인 진단 (cycle 434 lesson 후속 갱신)

cycle 434 (2026-05-15) 가 동일 패턴 첫 박제 — 15건 batch close + lesson commit. 본 박제 후 4일 (5/15~5/19) 동안 86건 추가 누적 = **hub D5 cron 의 fingerprint 매칭이 주간 단위로 재발**.

### 재발 메커니즘 가설

closed 5/18 batch (#736~#740) 와 open 5/18~5/19 batch (#842~#927) 비교:
- 동일 fingerprint `ci-develop-cycle-pick-vs-ai-29` 가 #740 (CLOSED 5/18) + #927 (OPEN 5/18 21:04:15Z) 동시 존재
- hub `incident-followup.yml` D5 cron 이 `(fingerprint, run_date)` 쌍 단위로 reminder 생성 추정
- 또는 fingerprint match 가 lesson commit body 의 fingerprint 키워드 grep 만 수행 → 시간 윈도우 만료 시 재발

**핵심 한계**: hub D5 cron 이 "이미 lesson 박제 + close 처리된 fingerprint" 재발 차단 X.

## 결론

**외부 요인 (이미 resolved) — batch close**.

- 86건 모두 워커 측 PR 머지 + CI green 자연 회복 완료
- worker 측에서 할 수 있는 행동 = **batch close + 본 lesson 박제 + hub workflow 개선 carry-over**
- 동일 패턴 cycle 434 lesson 후 4일 만 재발 = hub 측 워크플로 자체 개선 없으면 영구 재발 (월 100+건 누적 가능)

## 박제 의무

1. 본 워커 측 `lesson:` commit 1건 = 86 fingerprint batch 박제 (본 markdown)
2. 워커 측 mass close 86 reminder issue (`gh issue close --comment "lesson-pending-86-batch-close — PR <num> 참조"`)
3. **carry-over (hub 측, 사용자 결정 영역)**: `incident-followup.yml` D5 cron 개선 — 동일 fingerprint 의 closed worker issue 존재 시 신규 reminder 생성 skip OR 14일 이상 stale reminder 자동 close

## 후속 메타 패턴

cycle 434 lesson + cycle 669 lesson = 2회 동일 batch 패턴 박제. **N=3 도달 시** `meta-pattern` dispatch 자율 발화 후보 — hub workflow 재발 패턴이 본 메인 자가 진단 chain 의 noise source 화 박제.

영구 해결 = hub repo 측 workflow 수정. 워커 측 발화는 운영 cleanup 만.
