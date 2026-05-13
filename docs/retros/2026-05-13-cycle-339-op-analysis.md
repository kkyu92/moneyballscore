# Retro cycle 339 — operational-analysis lite

**날짜**: 2026-05-13  
**체인**: operational-analysis (lite)  
**트리거**: cycle 337 + 338 연속 retro `next_recommended: operational-analysis lite` / v1.8 첫 적용 주 W22 데이터 신선

---

## What (이번 사이클에서 한 것)

### 1. W22 + W21 성과 집계

| 주차 | 날짜 | 적중률 | 비고 |
|---|---|---|---|
| W22 | 5/12(화) | 2/5 = 40.0% | 원정팀 4/5 압승 패턴 |
| W22 | 5/13(수) | — | 미완료 (예정) |
| W21 | 5/5~5/10 | 15/27 = 55.6% | 일요일 제외 시 63.6% |
| **누적** | n=94 | 46/94 = 48.9% | — |

### 2. W21 요일별 분해 분석 (신규 발견)

- 금요일(5/8): 4/4 = **100%**
- 일요일(5/10): 1/5 = **20%** ← 구조적 이상치 확인
- 일요일 격리 효과: 비일요일 누적 **50.6%** vs 일요일 **20.0%**
- 일요일이 전체 적중률을 1.7%p 끌어내리는 주범

### 3. 확신도 역설 재확인 (5회 연속)

- 고확신(≥0.5): 38/79 = **48.1%**
- 저확신(<0.5): 8/15 = **53.3%**
- W22 5/12: 저확신(0.3) 정답 2건, 고확신(0.45~0.52) 오답 3건

### 4. 팩터 방향 정확도 (cycle 337 대비 변화 없음, n=94 유지)

- lineup_woba: 78.7% / elo: 77.1% / bullpen_fip: 72.9%
- sfr: 47.3% (유해 지속)

### 5. CHANGELOG 업데이트 + 2개 패턴 파일 작성

- `docs/lessons/2026-05-13-day-of-week-isolation-pattern.md`
- `docs/lessons/2026-05-13-confidence-inversion-calibration-signal.md`
- gstack `learnings.jsonl` 2건 등록

---

## Decisions (결정 내용 및 이유)

### 가중치 조정: 없음
- v1.8 (head_to_head 3%→, elo 8%→10%) 적용 직후 (5/12~)
- n=94 — v2.0 임계 n=150까지 56건 부족
- 단 5개 데이터 포인트(W22 5/12)로 방향 결론 불가

### Sunday cap 추가 강화: 보류
- 현재 0.55 적용 중. 일요일 20% 지속이지만 n=5 소표본
- n=15+ 일요일 샘플 후 통계 유의성 검정 후 결정

### 5/13 게임 예측 상태: 파악만
- 5/13 게임 5개 모두 scheduled 상태, 예측 없음
- 파이프라인이 오늘 자동 실행 예정 (Cloudflare Worker cron)

---

## Worked (잘 된 것)

- 일요일 격리 분석: 전체 적중률 저하의 구조적 원인 파악 (일요일 20% 고립)
- W21 요일별 분해로 새로운 데이터 포인트 추가 (금요일 100%, 일요일 20%)
- 비일요일 누적 50.6% = 모델이 정상 조건에서는 baseline(50%) 근접 확인
- gstack learnings에 2개 재사용 가능 패턴 등록

## Didn't Work (안 된 것)

- 5/13 게임 예측이 아직 없어 당일 데이터 분석 불가
- W22 데이터 = 5/12만 (1일치). 일주일 전체 분석은 다음 사이클로 carry-over
- 20개 lesson-pending 이슈 미처리 (scope 초과 — cycle 338 fix 연결 lesson은 별도 처리 필요)

---

## Next Candidates

### 1. `fix-incident` — lesson-pending 이슈 일괄 처리
- 20개 `lesson-pending` 이슈 (CI 실패 인시던트 미처리 레슨)
- cycle 338 보안 수정이 근본 원인 해결 → 통합 lesson commit 1건 + 이슈 일괄 close
- fingerprint 기반 lesson 박제 패턴 정립

### 2. `operational-analysis lite` — W22 완료 후 v1.8 첫 주 집계
- W22 종료(5/17) 후 v1.8 최초 전체 주 데이터 집계
- 일요일 분석 (5/17 Sun — n 누적)
- sfr 47.3% 유해 패턴 지속 여부

### 3. `polish-ui` — 확신도 역설 사용자 노출 개선
- 고확신 예측이 오히려 저성과 → 사용자에게 "고확신=정답" 오해 방지 필요
- 예측 카드에 "모델 신뢰도" vs "역대 적중률" 분리 표시 검토
- 저확신(0.30) 예측 2개 정답 → "의외의 역전"류 UX 개선 후보

---

## Dispatch Summary

- `lesson:` 패턴 2건 (lesson 파일)
- `policy:` cycle 339 retro (이번 커밋)
