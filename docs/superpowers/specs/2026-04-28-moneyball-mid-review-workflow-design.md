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

## 8. CEO 리뷰 결과 (2026-04-28 진행 완료)

### Anchor reframe (D1)

A → **B 채택**: "지속 가능 자동 성장 + AdSense 수익" hard, 적중률 60% stretch (80% 더 좋고). 외부 sportsbook 58% 상한 + v0.5.26 v3 backtest null + 프로젝트 실제 시간 분배 (UI/SEO/인프라 70%) 모두 정합.

### Workflow 압축 (D2)

3 agents → **2 agents + 사이드 + 적중률 직접 인용**:
- Agent 1: AdSense path gap audit (general-purpose, web search)
- Agent 2: 서브 인프라 audit (Explore subagent)
- 사이드 (직접): silent fail audit (사례 8 후보)
- 적중률 ceiling: 종합 단계 직접 인용 (v0.5.26 + sportsbook 58% + 현 38%)
- ~25-30분

### Finding 1 — Architecture (Agent split, D3)

통합 agent dual-purpose risk → 위 압축으로 해결 (Agent 2 = Explore code-only, Agent 1 = web).

### Finding 3 — 출력 verification (D4)

종합 출력 (risk map + 60일 결정) 에 outside voice (codex 또는 claude subagent) 1단계 추가.

### Finding 4 — Archive/reuse (D5)

산출물 → `docs/reviews/mid-review/{YYYY-MM-DD}.md`. risk map + 60일 결정 + baseline metrics row 누적. 1년 horizon ~6 사이클 비교용.

### Finding 2 — minor edge cases

- 사용자 검토 단계 응답 없음 default: 워크플로 pause + 다음 세션 resume
- Issue 57 mid-flight 도착: side note 처리, 다음 사이클 통합

## 9. Codex outside voice 결과 (8 findings + 3 open questions)

CEO 리뷰 마지막 단계 codex (GPT-5.4, reasoning_effort=high) 가 plan 자체 challenge. 8건 중 6건 본질적 cross-model tension.

| # | Codex finding | CEO review tension | 사용자 결정 |
|---|---|---|---|
| 1 | 서브 워커-허브 top-2 축 오판 — hub-dispatch + Cloudflare worker = 운영 배관, 성장 엔진 X | anchor B reframe 후 비중 줄였으나 §2 그대로 | 다음 세션 |
| 2 | "지금 결론 못 낸다" 무시 — N=37, 5/1 N≥50 대기 | 0A option D 일부 상응 | 다음 세션 |
| 3 | AdSense audit 돌아감 — ads.txt placeholder + 스크립트 부재 + privacy "도입 예정". fix-first 가 직접 path | CEO review 놓침 | 다음 세션 |
| 4 | archive baseline 재현 불가 — PV/revenue 외부 dashboard 의존 | Finding 4 archive 박았는데 데이터 없음 | 다음 세션 |
| 5 | 검증 약함 — spot-check 1/agent 부족 | Finding 3 일부 catch | 다음 세션 |
| 6 | "적중률→콘텐츠 가치" 가정 증명 X — about/JudgeReasoningCard explanation-heavy | anchor B 부분 reframe 했으나 §2 텍스트 그대로 | 다음 세션 |
| 7 | 진짜 빠진 축 = acquisition/distribution (색인→노출→클릭→재방문) | 메인2 흡수만 함 | 다음 세션 |
| 8 | 워크플로 자체 과설계 — 메타-work | HOLD SCOPE 결정과 반대 | 다음 세션 |

### Open questions (codex)

- site PV / AdSense revenue 어디서 읽나
- PlayBook → moneyball 자동 적용 이 실제 사용자 가치 / 성장 지표 올린 증거 있나
- 수익 hard target 이면 왜 AdSense 가 1차 monetization? 구독/스폰서/제휴 보다 우선 근거?

## 10. 다음 세션 첫 결정 (약 5분)

| Option | 내용 | 영향 |
|---|---|---|
| A — Codex 수용 | 본 plan 폐기 → "5/1 까지 계측 대기 + 그 사이 fix-first 1주 작업 list" 로 재정의. fix = ads.txt 채움 + AdSense 스크립트 + privacy update + Search Console 색인 + 콘텐츠 깊이 | 본 세션 산출물 archive 만, 행동은 다른 형태 |
| B — 부분 수용 | Agent 1 방향 fix-first 점검으로 전환 + 메인2 분리 (AdSense / distribution) + 서브 격하 + 60일 결정 → "조건부 권유" | 워크플로 유지, 텍스트 수정 |
| C — 강행 | Codex informational 만, plan 4 finding 수정본 그대로 실행 | 일관성 우선 |
| D — 재설계 | 처음부터 brainstorm | 시간 큼 |

**Recommendation: A** — codex #3 (ads.txt 직접 확인) + #7 (acquisition path) 코드 직접 논거 + N=37 한계 TODOS 입력 + audit 보다 fix-first ROI 높음.

---

### PIVOTED 결정 (2026-04-28 18시 KST 세션, D7)

**채택: A — Codex 수용**. 본 워크플로 archive (실행 안 함). plan 자체는 의사결정 역사 기록으로 보존 — § 8~9 = brainstorm + CEO review + codex 결과. fix-first 진행 상태는 `TODOS.md` 별도 섹션 참조.

#### 17시 cron 자연 검증 — 사례 8 박는 근거 약화 (D10a 갱신)

D7 결정 직전 4/28 cron 자동 fire. `pipeline_runs?run_date=eq.2026-04-28&mode=eq.predict` 8건 모두 `errors=[]`, `daily_notifications` `summary_sent=true` (07:19 UTC = 16:19 KST). summary fix `9b7e1b8` 효과로 4/22~28 의 5/5 silent 패턴 4/28 부서짐. **사례 8 CLAUDE.md 추가 보류** — 단일일 표본, 1주 누적 후 재평가.

#### Pre-pivot 인프라 fix 1건 (D8a #2)

`5c3588a feat(adsense): env-driven AdSense 스크립트 자동 주입 패턴 추가` — `apps/moneyball/src/app/layout.tsx` head 에 `ADSENSE_PUBLISHER_ID` env 검증 후 adsbygoogle.js 자동 삽입. ads.txt route 와 동일 env-driven 패턴. publisher ID 보유 전 인프라만 박음. 가입/심사 통과 후 vercel env 한 줄 추가만으로 자동 활성.

#### 보류 (publisher ID 발급 후 처리)

- `vercel env add ADSENSE_PUBLISHER_ID production` (값 = `pub-xxxxxxxxxxxxxxxx`)
- `apps/moneyball/src/app/privacy/page.tsx:44, 62` "도입 예정" 문구 → "이미 적용" 으로 수정

#### 사용자 영역 (D8a #4, #5 — 자연 진행, 권유 X)

- Google Search Console 색인 요청 10건 (TODOS.md 참조)
- 콘텐츠 깊이 보강 (지속)

#### 5/1 H1~H5 SQL 검증 (D12a — 자연 트리거 즉시)

TODOS.md L91~141 SQL 그대로 복붙. 5/1 09시 N≥50 도달 자연 트리거.

## 11. 본 세션 commit + handoff

- spec commit: `6d950bb` (1차 brainstorm) + `bb9fa90` (CEO + codex 결과)
- CEO review log 박음 (`gstack-review-log`)
- handoff save → 다음 세션 첫 작업 = §10 결정 ✅ A 채택 (2026-04-28 18시 KST 세션)
- 인프라 fix 1건: `5c3588a` (env-driven AdSense script)
