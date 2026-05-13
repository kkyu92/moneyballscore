# Retro: Cycle 346 — operational-analysis lite (2026-05-13)

**버전**: v0.5.48.0 (코드 변경 없음, 분석/문서만)  
**체인**: operational-analysis lite  
**트리거**: cycle 345 retro `next_recommended: operational-analysis` + v1.8 첫날(5/13) + W22 5/12 신선 데이터

---

## What (무엇을 했나)

### 1. W22 (2026-W20) 성과 분석

| 항목 | 값 |
|---|---|
| W22 5/12 적중률 | **2/5 = 40.0%** (Brier=0.3406) |
| W22 5/11 | 휴식일 (KBO 경기 없음) |
| W21 (5/5~5/10) | **15/27 = 55.6%** (Brier=0.2542) |
| 전체 누적 (n=94) | **46/94 = 48.9%** (Brier=0.2549) |

**W22 5/12 패턴**: 원정팀 5/5 전승(극단값). 저확신(0.30) 예측 2건 정답, 중고확신(0.45~0.52) 3건 오답.

### 2. 팀별 정확도 이상치 발견 (신규)

| 팀 | 적중률 | 신호 |
|---|---|---|
| OB (두산) | 60.0% (6/10) | ↑ 최강 |
| KT | 57.1% (8/14) | ↑ 안정 |
| **WO (키움)** | **16.7% (1/6)** | 🚨 이상치 |

**키움 WO**: 6경기 중 5경기 오답. 팀 특성(속공/수비) 미반영 가능성.

### 3. 요일별 확인

| 요일 | 적중률 |
|---|---|
| 금 | 68.8% (11/16) ↑ |
| 일 | **14.3% (2/14)** 🚨 Sunday cap 유지 중 |

### 4. extract-pattern 3건 추출

| 카테고리 | 패턴 |
|---|---|
| content_auto | `cjk-safe-og-image-latin-fallback` (cycle 345 OG 이미지) |
| anti_pattern | `accuracy-query-without-prediction-type-filter` (cycle 331) |
| data_pipeline | `per-category-accuracy-outlier-detection` (키움 16.7% 이상치) |

### 5. CHANGELOG v0.5.48.0 버전 항목 추가

cycles 340-345 코드 변경(OG 이미지 / nav description / picks 소셜 프루프)을 v0.5.48.0으로 묶어 기록.

---

## Decisions (결정과 이유)

| 결정 | 이유 |
|---|---|
| 가중치 조정 없음 | v1.8 첫날, n=94 (v2.0 임계 n=150까지 56건 부족) |
| Sunday cap 0.55 유지 | 일요일 14.3% 패턴 불변. cap 이후 개선 데이터 미충분 |
| WO 이상치 모니터링만 | n=6 소표본. n=150 이후 팀별 보정 검토 |
| operational-analysis lite 선택 | cycle 345 retro 추천 + v1.8 첫날 + 신선 데이터 자연 trigger |

---

## Worked (잘 됐던 것)

- **팀별 세그먼트 분석**이 집계 지표에서 보이지 않던 키움 이상치를 즉시 포착
- **extract-pattern 3건** — CJK OG Image 패턴은 범용성 높아 다른 한국어 Next.js 앱에도 바로 적용 가능
- **v0.5.48.0 버전 정리**: cycles 340-345 기간 CHANGELOG에 버전 항목 누락 상태를 이번 compound에서 회복
- W22 5/12 데이터 분석 → cycle 341/339 대비 팀별 뷰 추가로 인사이트 심화

---

## Didn't Work (아쉬운 것)

- **operational-analysis 중복 실행**: cycle 337/339/341/346 모두 W22 같은 데이터를 반복 분석. 신규 verified data 없는 날에는 lite 발화가 과잉.
- **n=94 → n=150 진전 없음**: 매 사이클 "v2.0 임계까지 56건" 동일 메시지. 자연 증가 외 가속 수단 없음.
- **요일별 방향 정확도 수치** cycle 337 기록(78.7%, 77.1%)과 이번 분석(60.2%, 56.0%) 불일치. 측정 방법론 표준화 필요.

---

## Next Candidates (다음 사이클 입력 큐)

### 1순위: explore-idea (medium priority)
- v1.8 첫주(5/13~) 예측이 쌓이면서 product direction 검토 시점
- 키움 팀 특성 미반영 → 팀별 가중치 보정 feature idea
- AdSense 심사 준비 상태 점검 (about/privacy 완비 확인)
- TODOS.md Next-Up 항목 스캔

### 2순위: review-code (heavy)
- 최근 4-5 사이클 기능 추가(OG image, picks social proof, nav) 후 silent drift 가능성
- `opengraph-image.tsx` CJK 폰트 처리 코드 주석 정합성 확인
- `buildWeeklyReview.ts` 팩터 방향 정확도 계산 로직 vs 이번 Python 분석 불일치 원인 규명

### 3순위: polish-ui
- `/reviews/weekly/[week]` 페이지 breadcrumb 누락 (grep -L 확인됨)
- `/reviews/monthly/page.tsx` breadcrumb 누락
- 팀별 정확도 표를 accuracy 페이지에 노출 (현재는 CHANGELOG에만)

---

## skill-evolution trigger 평가

| trigger | 충족 |
|---|---|
| chain-evolution 5건 누적 | ❌ |
| 같은 chain 5회 연속 fail | ❌ |
| cycle_n % 50 == 0 | ❌ (346 % 50 = 46) |
| meta-pattern "SKILL 갱신 필요" | ❌ |
| 직전 20 사이클 특정 chain 0회 발화 (평가 대상 3개) | ❌ (review-code/explore-idea/polish-ui 모두 발화) |

→ skill-evolution 마커 생성 **없음**.
