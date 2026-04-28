# Moneyball 중간점검 워크플로 설계

**작성일**: 2026-04-28
**대상 세션**: 같은 날 진행
**전제 — 최종 완료 정의**: 분석 적중률 80% (stretch) AND AdSense 수익 발생 (hard)
**전제 — Horizon**: 시즌 무관, 1년 연속 자동 성장. AdSense 가 hard 목표, 적중률은 stretch.

## 1. 목적

다음 세 질문에 1세션 안에 정량 근거 기반으로 답한다.

1. 지금까지 작업이 문제 없는가 (silent fail / drift / 회귀)
2. 최종 목표 도달 path 에 장애물이 있는가
3. 무엇이 / 얼마나 남았는가 (gap 정량화)

산출물은 사용자가 시간 들이지 않고 다음 60일 의사결정에 쓸 수 있는 형태여야 한다.

## 2. 우선순위 (B+C 선택 결과)

1. AdSense path (hard 목표) — 사이트 트래픽 → 광고 수익까지 무엇이 막혀있나
2. 서브 워커-허브 무한성장 인프라 — 양방향 자동화가 진짜 무한성장 path 인가
3. 적중률 — 38% → 60% stretch (80% 는 더 좋고). 적중률 < 60% 면 콘텐츠 가치 낮아 #1 막힘 — 의존성 있음

이전 dashboard 의 "적중률 ❌ 가 핵심 위협" 프레이밍은 부정확. AdSense + 서브 가 실은 핵심.

## 3. 워크플로 (approach B — 병렬 agents + 사용자 종합)

### 3.1 Agents

**Agent 1 — AdSense path gap audit** (`general-purpose`)

- 입력
  - 사이트 URL (https://moneyballscore.vercel.app)
  - 현재 sitemap·robots·핵심 페이지 200 상태 (이미 아는 값 제공)
  - 콘텐츠 깊이 데이터 (블로그 포스트 수·평균 길이·고유 정보량)
  - 사용자 가시 dev 잡탕 위반 여부 (`feedback_ui_copy_no_dev_jargon.md`)
  - AdSense 정책 외부 검색 권한
- 산출 (1-page)
  - AdSense 첫 수익까지 알려진 단계 (PV 임계, 콘텐츠 양 임계, 정책 통과) 각 단계 현재 위치
  - 기술적 path 장애물
  - 60일 horizon 도달 가능성 (낮음/중간/높음 + 정량 근거)

**Agent 2 — 서브 인프라 audit** (`Explore`)

- 입력
  - worker 코드 경로 (`packages/kbo-data/`, `cloudflare-worker/`)
  - PlayBook 이슈 dispatch 코드 위치
  - lesson dispatch 로직
  - hub→worker 자동 적용 path 부재 코드 위치
- 산출 (1-page)
  - 양방향 의 현실 한 방향 비율 / 자동 적용 0%
  - 무한성장 요건 (자동 적용·자동 검증·자동 회귀) 충족도 정량 평가
  - Issue 57 응답 도착 시 1주 안에 양방향 닫는 minimum 작업 list

**Agent 3 — 적중률 ceiling analysis** (`general-purpose`, web search)

- 입력
  - KBO 통계 (홈팀 기본 승률 ~57%)
  - 외부 sportsbook 평균 (~58%) 검증 권한
  - 현재 v1.6 38%, v1.5 75%
  - H1~H5 가설 (TODOS.md)
- 산출 (1-page)
  - KBO 환경 적중률 상한선 정량 추정
  - 60% stretch 도달 가능성 (현재 path 로 / v3 새 path 가 필요한지)
  - 80% 이론상 가능 임계 / 현실상 무리 임계

### 3.2 사이드 (제가 직접 병렬 수행)

silent fail / drift audit

- 사례 8 = summary silent fail 후보 박을 가치 평가
- CLAUDE.md 사례 1~7 옆에 추가 권장안
- 다른 잠복 신호 (4/28 17시 cron 결과 도착 전 추정)

### 3.3 Sequencing

```
T+0min:  Agent 1, 2, 3 dispatch (parallel)
T+0min:  silent fail audit 직접 시작 (parallel)
T+25min: 4개 결과 수신
T+25min: 검증 — 각 agent 정량 데이터 1건 spot-check
T+30min: 종합 → 통합 risk map + 60일 결정 1~2건
T+40min: 사용자 검토 → 결정 fix
```

### 3.4 Synthesis 출력

**Output 1 — 통합 risk map**

3 path × 4 컬럼 표:

| Path | 현재 위치 | 60일 도달 가능성 | 핵심 장애물 |
|---|---|---|---|

축 간 상호의존성 명시 (예: 적중률 < 60% 면 콘텐츠 가치 낮음 → AdSense 약화)

**Output 2 — 60일 결정 1~2건**

각 결정 항목

- 무엇을
- 왜 지금
- 안 하면 비용
- 예상 시간

**Output 3 — 사례 8 박기 결정**

- silent fail audit 결과
- CLAUDE.md 추가 PR 작성/보류

## 4. Error / Edge Cases

| Edge | 대응 |
|---|---|
| Agent 1 외부 web (AdSense 정책) fetch 실패 | 알려진 일반 임계 (PV 1만/월 등) 사용 + 근거 표기 |
| Agent 2 PlayBook 다른 repo access 못 함 | moneyball 측 path 만 분석 + "PlayBook 측 미확인" 명시 |
| Agent 3 web search timeout | 메모리 알려진 외부 sportsbook 통계 (~58%) 사용 + 근거 표기 |
| 4 결과 모두 "낮음" 가능성 | risk map 그대로 제시. 거짓 낙관 금지 |
| Agent 가 spot-check 실패 (정량 ↔ 현실 불일치) | 해당 agent 결과 신뢰도 표시 — "재실행 필요" 또는 "사용자 직접 검증" |

## 5. Verification

- Agent 결과 ↔ 현실 1건씩 spot-check (예: Agent 2 lesson dispatch 작동 단언 → 4/28 actual lesson row 1건 SQL 로 확인)
- 종합 risk map 제시 후 사용자 1회 확인 → 진행
- Trust-but-verify 원칙 (system instruction)

## 6. 워크플로 자체의 가정 — CEO 리뷰에서 검증할 항목

CEO 리뷰 (이 design 작성 후 다음 단계) 가 깰 가능성 있는 가정

- AdSense 수익 발생이 hard 목표인 게 정합한가? (트래픽 자체가 더 본질일 가능성)
- 적중률 60% stretch 도 충분히 ambitious 한가? (50% 면 KBO 내 무가치 / 70% 면 외부 sportsbook 초과)
- 1세션 점검의 의미 — 정량 데이터 부족 (verified=37) 상태에서 의사결정 가능한가? 5/1 N≥50 까지 미루는 게 본질 아닌가
- "양방향 무한성장" 정의가 명확한가? PlayBook → moneyball 자동 적용이 정말로 product 가치 창출 path 인가, 단순 운영 편의인가

## 7. 비-목표 (의도적으로 뺀 것)

- `/qa-only` (사이트 품질) — 4/28 13시 측정 ✅ 결과 이미 있음. 1일 사이 중복.
- `/cso` (보안) — 최종 목표 아님.
- `/health` (코드 품질) — 별 축. 현 점검 범위 밖.
- `/compound` — `/retro` + `/extract-pattern` 조합으로 동일 효과. 중복.
- `superpowers:/brainstorm` 신규 — 이미 진행 중. 재귀 X.
- 5/1 결정 직접 실행 — N=37 표본 부족. "데이터로만 이야기" 메모리 위배.

## 8. 다음 단계

1. 이 spec 사용자 검토
2. `/plan-ceo-review` 실행 — design 자체를 CEO 시각에서 검증
3. CEO 리뷰 결과 반영 → 본 워크플로 실 실행 (agents dispatch)
