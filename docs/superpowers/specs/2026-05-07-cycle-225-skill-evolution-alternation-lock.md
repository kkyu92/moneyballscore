# cycle 225 skill-evolution — 2-chain alternation lock 탐지 룰 + info-architecture-review trigger 강화

**날짜**: 2026-05-07  
**cycle**: 225  
**chain**: skill-evolution (trigger 5: info-architecture-review 0-fire 직전 20 사이클 + alternation lock 관찰 패턴)  
**skill-evolution 회차**: 14회째 자가 진화

## trigger evidence

| trigger | 측정 결과 |
|---|---|
| trigger 5 (0-fire chain) | info-architecture-review: 직전 20 사이클 (205-224) 0회. design-system: 0회 |
| alternation lock | 직전 8 사이클 (217-224) distinct chain = 2 (explore-idea ↔ review-code 교대, 100%) |
| skill-evolution-pending 마커 | cycle 224 박제 (`9a6d48c`) → cycle 225 강제 발화 |

**root cause**: 신규 UI 섹션이 기존 page.tsx 안에 추가됨 (신규 page.tsx 파일 X) → 라우트 신규 추가 trigger 미포착 → info-architecture-review 영구 미발화. review-code ↔ explore-idea stable 2-attractor = 다른 chain 장기 차단.

## 갱신 영역

### 1. `info-architecture-review` trigger 2건 추가

- **(7) 직전 12 사이클 중 explore-idea ≥ 5회 + info-architecture-review 0회**: 신규 UI 섹션 추가 후 IA 점검 미발화 패턴 포착
- **(8) docs/design/ia-*.md spec "다음 cycle 후속 후보" 항목 미처리 ≥ 20 사이클**: cycle 203 spec (2026-05-07, 헤더 메가메뉴 / 푸터 sitemap / sitemap.xml 동기) 22 사이클 미처리 사례 포착

### 2. 2-chain alternation lock 탐지 룰 신규 추가

위치: 사이클 단계 2 (chain 선택) — "메인 자유 추론" 앞

**로직**: 직전 8 사이클 distinct chain ≤ 2 (interrupted/unknown 제외) 시 발동:
1. 잠긴 chain 2개를 해당 사이클 후보에서 제외 (cooldown N=1)
2. 남은 pool 에서 trigger 가장 강한 chain 선택
3. trigger 없으면 `polish-ui` 강제 fallback (신규 UI 섹션 디자인 점검)
4. 잠긴 chain 중 `fix-incident` 이면 lock 무시 (안전 우선)

**cooldown 과 차이**: lite chain retro-only cap = 같은 chain 5회 실패 시. 본 룰 = 성공 중인 2개 chain 이 나머지를 장기 차단.

### 3. 진단 source table `info-architecture-review` 행 추가

- 직전 12 사이클 explore-idea ≥ 5회 + info-arch 0회 (chain 분포 측정)
- docs/design/ia-*.md "다음 cycle 후속 후보" 미처리 ≥ 20 사이클

## 메타 패턴 기록

**R5 메타 패턴 9번째 evidence**: cycle 211~224 (14 cycle) review-code ↔ explore-idea lock이 skill-evolution 강제 마커 → cycle 225 완주 → lock 탐지 룰 박제. 신규 UI 섹션 = 신규 route X → 기존 trigger 공백 → 2-chain lock 심화 → skill-evolution 자가 감지 → lock 탐지 룰 추가.

**cycle 135 박제 재검토**: "0회 chain 5개 의도된 결과 항구화" 가설에서 info-architecture-review / design-system 은 cycle 202 사용자 발화로 항구화 해제된 상태. 본 cycle 225 에서 info-architecture-review 가 20 사이클 0-fire → trigger 강화 결정 (cycle 202 판단 일관).

## 다음 사이클 예상

cycle 226 = 2-chain alternation lock 탐지 룰 첫 적용. distinct chain = 2 (explore-idea ↔ review-code) → lock 탐지 → 잠긴 chain 제외 → polish-ui 또는 info-architecture-review 발화 예상.

**R5 진짜 PASS 조건 (isolated smoke 단독 X)**:
- cycle 226 에서 lock 탐지 룰이 자연 발화 trigger 가 되어 실제 다른 chain 발화 + PR ship

## cycle 49 룰 PASS_ship 누적

cycle 224 기준: PASS_ship 누적 95
