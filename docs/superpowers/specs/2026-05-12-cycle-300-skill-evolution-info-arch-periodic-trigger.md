# skill-evolution spec — cycle 300 milestone (20회째 자가 진화)

**날짜**: 2026-05-12
**cycle**: 300
**chain**: skill-evolution
**triggers**: trigger 3 (300 % 50 == 0) + trigger 5 (info-architecture-review 0회/20)

## 진단 evidence

### 직전 20 사이클 chain 분포 (280-299)
| chain | 횟수 |
|---|---|
| review-code | 5 |
| explore-idea | 5 |
| polish-ui | 5 |
| fix-incident | 3 |
| operational-analysis | 2 |
| **info-architecture-review** | **0** |

### trigger 5 분석
- 평가 대상 4개 중 `info-architecture-review` = 0회 → trigger 5 충족
- **원인**: info-arch의 자체 periodic trigger 부재. op-analysis(25-cycle), fix-incident(20-cycle)과 달리 gap이 길어도 자동 fire 메커니즘 없음
- **마지막 발화**: cycle 273 (sitemap redirect-only 제외 작업). cycle 300까지 **27 사이클 gap**
- **실제 IA 문제 없음**: breadcrumb, sitemap, hub page, footer 모두 정상. trigger 5는 false positive

### trigger 5 false positive 패턴 재확인
| chain | periodic trigger | trigger 5 opt-out |
|---|---|---|
| op-analysis | 25-cycle (cycle 255 박제) | ✅ opt-out |
| fix-incident | 20-cycle (cycle 257 박제) | ✅ opt-out |
| **info-architecture-review** | **없음** | **❌ 누락** ← 이번 fix |

## 변경 내용 3가지

### 1. info-architecture-review chain pool — trigger (9) 추가
```
(9) 마지막 info-architecture-review 발화 이후 ≥ 30 사이클
    (장기 미발화 주기 보정, lite 자동 권장 — cycle 300 박제)
```
- 30 사이클 = 현실적 발화 주기 (cycle 203 첫 발화 → cycle 273 = 70 사이클 간격. 30 사이클 = 보수적 하한)
- lite 자동 권장 = 실제 IA 문제가 없을 가능성이 높아 무거운 구현보다 진단 우선

### 2. 진단 source 표 — info-arch 30-cycle gap 체크 명령 추가
```bash
for n in $(seq $((CYCLE_N-30)) $((CYCLE_N-1))); do
  python3 -c "import json; d=json.load(open('/Users/kyusikkim/.develop-cycle/cycles/$n.json'));
  c=d.get('chain_selected','?').split()[0]; print('$n' if c=='info-architecture-review' else '')" 2>/dev/null
done | grep -v '^$'
# 출력 없으면 30+ 사이클 미발화 = trigger 충족
```

### 3. skill-evolution trigger 5 영구 opt-out — info-arch 추가
- opt-out 5개 → **6개** (info-architecture-review 추가)
- 평가 대상 4개 → **3개** (review-code / explore-idea / polish-ui)
- **근거**: 30-cycle periodic trigger가 fire 보장 → trigger 5 중복 검사 noise

## cycle 300 milestone 현황

| 지표 | 값 |
|---|---|
| PASS_ship 누적 | **164** (cycle 299 기준) |
| skill-evolution 자가 진화 | **20회** (cycle 300) |
| 직전 20 사이클 success rate | 90% (18/20) |
| trigger 5 평가 대상 | 3개 (review-code / explore-idea / polish-ui) |
| info-arch 다음 예상 발화 | cycle ~303 (30-cycle trigger) |

## MIGRATION-PATH.md append 내용

cycle 300 = skill-evolution 20회째 자가 진화 milestone:
- trigger: trigger 3 (300%50=0) + trigger 5 (info-arch 0회/20)
- 갱신: info-arch 30-cycle 주기 보정 trigger + trigger 5 opt-out 5→6개 (평가 대상 4→3개)
- PASS_ship 164 (cycle 299 기준)
