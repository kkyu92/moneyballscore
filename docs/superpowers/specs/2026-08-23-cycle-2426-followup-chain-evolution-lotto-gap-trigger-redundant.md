# cycle 2426 chain-evolution 후보 — lotto 30-cycle gap trigger 무의미 재발 4회 누적

## 문제

`lotto` chain 의 trigger (6) "마지막 lotto 발화 이후 ≥ 30 사이클" (cycle 772 박제) 이 순수 시간 경과만 측정하고 실제 self-heal 필요 여부는 확인하지 않는다. 마지막 실제 `chain_selected=lotto` fire 는 cycle 2392 — 이후 30-cycle gap 이 cycle 2422 부터 이미 충족됐으나, 매 사이클 재확인 결과 상태가 이미 self-heal 완료 상태라 재발화가 no-op 로 끝나는 패턴이 3회 연속 누적됐다 (cycle 2392/2422/2424, TODOS.md cycle 2424 retro 명시). 본 cycle 2426 에서 재확인 결과 4번째 재발 확정.

## 증거 (cycle 2426 실측)

- `~/.develop-cycle/cycles/` 기준 lotto chain 마지막 실제 선택 = cycle 2392 (34 사이클 전)
- `~/lotto_picks/2026-08-22-result.md` mtime = 2026-08-23 14:10 (오늘, 최신 회차 결과 이미 반영)
- `~/lotto_picks/2026-08-29-50sets.md` mtime = 2026-08-23 11:23 (오늘, 다음 회차 picks 이미 생성)
- 원인 확인: `.github/workflows/lotto-pick-update.yml` + `lotto-result-update.yml` + `lotto-pick-monitor.yml` 3개 GH Actions cron 이 develop-cycle 과 완전 독립적으로 매주 lotto self-heal (picks 생성 + 결과 갱신 + monitor) 을 수행 중 — trigger (1)(2)(3) (파일 부재 기반) 이 이미 정상 작동해 대부분의 주에 develop-cycle 자체 lotto chain 개입이 불필요.
- 반면 trigger (6) 은 파일 상태 무관하게 순수 cycle 카운트만 보고 "마지막 실제 fire" 로부터 30 사이클 경과 시 영구히 계속 충족 상태 유지 (재발화 후 cooldown 리셋 메커니즘 자체가 "실제 chain_selected=lotto 선택" 에만 의존하는데, no-op 판단 시 다른 chain 을 선택하므로 카운터가 절대 리셋 안 됨 — 다음 사이클도, 그 다음도 계속 "30+ 사이클 경과" 로 잡혀 매 사이클 재확인 낭비 유발).

## 제안

trigger (6) 정의를 시간 경과 단독에서 "cron 워크플로우 최근 7일 실행 실패/누락 확인" 조건부로 변경:

```
(6) 마지막 lotto 발화 이후 ≥ 30 사이클 **AND**
    (`gh run list --workflow=lotto-pick-update.yml --limit 3` 최근 실행에 실패 존재
     OR `~/lotto_picks/<next-saturday>.md` 파일 부재
     OR `~/lotto_picks/<last-saturday>-result.md` 파일 부재)
```

즉 cron 이 정상 작동 중이면 (파일 fresh + 최근 실행 성공) trigger (6) 자체를 미충족으로 처리 — 순수 시간 경과만으로는 fire 하지 않음. cron 이 실패했을 때만 develop-cycle 이 안전망으로 개입.

## 영향 범위

- `~/.claude/skills/develop-cycle/SKILL.md` chain pool table lotto 행 trigger (6) 문구 + 진단 source table lotto 행 평가 명령 갱신
- skill-evolution 자가 진화 시 반영 (본 commit 은 evidence 축적, 실제 SKILL.md 변경은 다음 skill-evolution fire 시)

## 참고

- 최초 lotto chain-evolution 박제: commit 1161586b (cycle 772)
- 유사 패턴 선례: `expand-scope`/`design-system` 등 희귀 조건 chain 은 애초에 순수 시간 기반이 아님 — lotto 만 유일하게 "시간 경과=trigger" 단순 룰이라 cron 이식 후 구조적으로 노후화됨
