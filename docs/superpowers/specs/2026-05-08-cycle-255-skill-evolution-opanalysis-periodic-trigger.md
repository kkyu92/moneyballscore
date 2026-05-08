# cycle 255 skill-evolution — operational-analysis 25 사이클 주기 보정 trigger 추가

**날짜**: 2026-05-08  
**trigger**: skill-evolution-pending 마커 (`3354dc3`, cycle 254 retro) + trigger 5 (0회 발화 chain 5개)  
**자가 진화 회차**: 17회째

## 문제

직전 20 사이클(235~254) chain 분포:
- explore-idea: 8
- review-code: 5
- polish-ui: 3
- info-architecture-review: 2
- skill-evolution: 1
- unknown: 1
- **fix-incident: 0**
- **operational-analysis: 0** ← 핵심 설계 결함
- dimension-cycle: 0
- expand-scope: 0
- design-system: 0

operational-analysis 마지막 발화 = cycle 231. cycle 255 기준 24 사이클 갭.

**설계 결함 분석**: 기존 trigger 조건이 "예측 건수 COUNT % 50 == 0 OR ≥ 100 첫 도달" 에만 의존.  
현재 예측 건수 = 72건 (검증 완료). 이는 50~100 사이 구간으로 두 trigger 조건 모두 충족 불가.  
결과: v2.0 가중치 후보 확정 대기 중임에도 데이터 건강도 정기 점검이 24 사이클간 이루어지지 않음.

## 갱신 영역 3건

### 1. operational-analysis chain pool trigger (7) 추가

**변경 전**:
```
예측 건수 임계 도달 (COUNT % 50 = 0 또는 ≥ 100 첫 도달)
```

**변경 후**:
기존 trigger 유지 + 추가:
```
(7) 마지막 operational-analysis 발화 이후 ≥ 25 사이클 (장기 미발화 주기 보정, lite 자동 권장)
    — cycle 231→255 = 24 사이클 간격이 이 trigger 근거
```

### 2. operational-analysis 진단 source table 갱신

마지막 op-analysis 발화 cycle_n 체크 명령 추가:
```bash
for n in $(seq $((CYCLE_N-25)) $((CYCLE_N-1))); do
  python3 -c "... check chain_selected == 'operational-analysis' ..." 2>/dev/null
done | grep -v '^$'
# 출력 없으면 25+ 사이클 미발화 = trigger 충족
```

### 3. frontmatter description 갱신

- skill-evolution 자가 진화 횟수: 15회 → 17회 (cycle 252 + 255 반영)
- 직전 milestone: "cycle 230" → "cycle 252/255" 명시
- PASS_ship 누적: 120 → 123 (cycle 254 기준)

## 검증

- pnpm test (kbo-data): 561 tests PASS
- pnpm test (moneyball): 220 tests PASS
- SKILL.md 변경 라인: 3행 (operational-analysis trigger 행, 진단 source 행, frontmatter description)
- MIGRATION-PATH.md: cycle 255 entry append

## 예상 효과

다음 사이클부터 진단 단계에서:
```bash
# 25 사이클 미발화 체크 명령 실행
# → 출력 없음 = operational-analysis trigger 충족
```
→ cycle 256에서 operational-analysis (lite) 자연 발화 예상.
→ `/weekly-review` → `/extract-pattern` → `/compound` 시퀀스로 72건 현황 + v2.0 진행 상황 정기 점검.

## 근거 추가: fix-incident 0회 별도 메모

fix-incident 0회 발화는 "open GH issues 0건 + Sentry alert 0건 + debug commit 0건" 으로 trigger 미충족.  
이는 의도된 결과 (현재 안정 운영 중). trigger 설계 결함 X.  
단, Cloudflare Worker health check 추가 가치 있음 → 다음 skill-evolution 후보.
