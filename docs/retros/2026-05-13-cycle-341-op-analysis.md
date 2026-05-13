# Retro: Cycle 341 — operational-analysis lite (2026-05-13)

**버전**: v0.5.47.0 (코드 변경 없음, 분석/문서만)
**체인**: operational-analysis lite
**결과**: success (retro-only)

---

## What (무엇을 했나)

- W22 DB 직접 조회: scoring_rule 분포 분석 (v1.5/v1.6/v1.7-revert/v1.8)
- 전체 n=94 누적 성과 재집계: 48.9% / Brier 0.2549
- W22 5/12 예측 5건 분석: 2/5=40%, 저확신 역설 재확인
- v1.8 scoring_rule 첫 배치 시점 확인 (5/13 오전 pipeline부터)
- 3개 패턴 추출 → learnings.jsonl + CHANGELOG.md 기록
- cycle 340 v1.8 label fix의 실질 DB 반영 여부 검증

---

## Decisions (결정과 이유)

1. **가중치 조정 없음**: v1.8 scoring_rule 예측 0건 (5/12까지 전부 v1.7-revert 라벨). 데이터 없는 상태에서 조정 불가. n=150 도달 후 v2.0 확정 유지.

2. **scoring_rule을 model_version보다 우선 사용**: DB에서 model_version='v2.0-debate' 고정(에이전트 버전), scoring_rule이 실질 가중치 버전 구분자임을 확인. model-comparison 대시보드의 groupBy 기준도 scoring_rule이어야 함.

3. **v1.6(37%) 저성과 원인 확인 필요 후보**: game_id 151~3252 범위(v1.6)가 37% 저성과. 이 구간에 구조적 특이점이 있는지 다음 heavy op-analysis에서 검토 가치 있음.

---

## Worked (잘 됐던 것)

- Supabase 직접 REST API 조회로 scoring_rule 분포를 신속하게 파악
- cycle 340 retro 권고(op-analysis lite)가 적절했음 — v1.8 label fix 후 실제 DB 반영 확인이 필요했던 시점
- learnings.jsonl 21건 누적: ML 파이프라인 패턴 라이브러리 구축 진행 중

---

## Didn't Work (안 됐던 것)

- W22 5/13 경기가 아직 scheduled → 검증 데이터 없음, 분석 범위가 5/12(화) 5건으로 제한
- v1.8 성과 검증 불가 (data 0건) — 다음 op-analysis까지 1주 이상 대기 필요
- Brier 0.2549 소폭 악화 (0.2501 → 0.2549): W22 5/12 40% 영향. 추세 모니터링 필요

---

## Next Candidates (다음 사이클 후보)

1. **polish-ui** — /accuracy 대시보드에 scoring_rule별 성과 비교 시각화 추가. v1.8 첫 데이터 축적 시 즉시 렌더링 가능한 UI 준비
2. **review-code (lite)** — compareModels.ts가 model_version 기준으로 groupBy하고 있다면 scoring_rule로 교체 필요. health check로 확인
3. **explore-idea** — TODOS Next-Up 중 미진행 항목 탐색 (AdSense publisher ID 발급 후 처리 배치 등)

---

## 패턴 박제 (이번 사이클)

| 패턴 | 카테고리 | 범용성 |
|---|---|---|
| Versioned Label Drift After Model Upgrade | anti_pattern | 높음 — ML 파이프라인 공통 |
| Supply Chain Security CI Gate | quality_guard | 높음 — pnpm/npm 프로젝트 |
| Dual Version Field (model_version vs scoring_rule) | data_pipeline | 중간 — 에이전트+ML 혼합 시스템 |
