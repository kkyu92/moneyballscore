# AI Agent 협업 헌장 — MoneyBall Ecosystem

## Foundation 원칙

코드가 아니라 환경을 만든다. AI가 자유롭게 달릴 수 있는 울타리를 치고,
매 사이클이 다음 사이클의 자산이 되도록 시스템을 쌓는다.

---

## Compound Engineering — 회고가 다음 사이클의 입력이 되는 루프

- **Pre-commit QA Gate**: `.claude/settings.json` 훅이 타입 체크를 자동 실행. 실패하면 커밋 차단.
- **Post-push /compound 리마인더**: push 후 `/compound` 실행 안내 자동 출력.
- **회고 → 솔루션 → 메모리 → 다음 사이클**: 매 회고의 "다음 후보"가 다음 세션의 입력 큐.
- **실패도 자산**: 안 된 것은 `docs/solutions/`에 기록. 같은 시행착오를 두 번 하지 않는다.

## Context Engineering — AI에게 무엇을 보여줄 것인가

### CE-1: Layered Context Loading
매 세션 시작 시 순서:
1. CLAUDE.md (프로젝트 규칙)
2. AI-AGENT-GUIDE.md (이 문서)
3. `git log --oneline -10` (최근 맥락)
4. PLAN.md 또는 TODOS.md (현재 목표)
5. `git status` (현재 상태)

### CE-2: Signal-to-Noise 압축
- 2000줄 파일 전체를 읽지 않는다. offset/limit으로 필요한 범위만.
- 타입/인터페이스 우선 (정보 밀도 3-5배).
- 컨텍스트 창은 유한한 자원. 디자인 제약으로 받아들인다.

### CE-3: Search Before Assume
- "비슷한 게 있을 것 같다"는 추측 금지.
- Grep/Glob으로 먼저 확인. 있으면 그 패턴을 따른다.

### CE-4: Write-back
- 결정/학습은 즉시 CLAUDE.md 또는 docs/에 기록.
- 같은 사고를 두 번째 세션에서 다시 발견하지 않도록.

### CE-5: Pattern Following
- 새 기능 추가 시 기존 유사 기능을 먼저 찾고 그 패턴을 따른다.
- "더 나은 방법"이 있어도 일관성 우선. 다음 에이전트가 읽을 수 있어야 한다.

### CE-6: 에이전트별 컨텍스트 격리
- 팀 에이전트는 자기 팀 데이터만 본다.
- 심판 에이전트는 양쪽 논거 + 정량 모델만 본다.
- 회고 에이전트는 과거 예측 성과 데이터만 본다.
- 자기 영역 밖의 데이터를 보면 환각이 늘어난다.

## Harness Engineering — AI에게 어떤 울타리를 칠 것인가

### HE-1: 입력 검증
- AI에 데이터를 넘기기 전 타입/범위/null 검증.
- 잘못된 입력을 막는 게 잘못된 출력을 사후에 잡는 것보다 100배 싸다.

### HE-2: 출력 검증
- JSON 스키마, 확률 범위(0-1), 내부 일관성 검증.
- "홈팀 승 예측인데 승리확률 30%" 같은 모순 자동 차단.
- AI는 자신감 있게 틀린다.

### HE-3: Bounded Retry + 폴백
- 재시도 → 대체 모델 → 경량 처리 → 안전 기본값.
- 같은 방법 2회 실패 시 다른 접근으로 전환.
- "에러를 삼키고 잘못된 결과 반환"은 절대 금지.

### HE-4: Conditional Routing
- 팀 에이전트: 저비용 모델 (Haiku/Flash)
- 심판 에이전트: 중급 모델 (Sonnet)
- 라우팅 자체가 비용 제어이자 품질 제어.

### HE-5: Quality Gate
- Read → Edit → Build(0 에러) → Test → Commit.
- 단계 건너뛰기 불가.

### HE-6: 비용 인식
- 5경기 × 3콜(홈+원정+심판) + 1콜(회고) = 16콜/일
- 팀 에이전트 maxTokens: 800
- 심판 maxTokens: 1500
- 5 커밋 묶어 1 push (Vercel 배포 한도 관리)

### HE-7: 실패도 영구 자산화
- 안 된 것은 docs/solutions/에 기록.
- 다음 시도자가 같은 조사를 반복하지 않는다.

---

## 예측 에이전트 아키텍처 (12 에이전트)

```
[팀 에이전트 ×10]     [회고 에이전트]
SK HT LG OB KT       "최근 홈팀 과대평가 중"
SS LT HH NC WO       "KIA 예측 3연패"
     │                      │
경기: LG vs LT              │
     │                      │
[LG 에이전트]  [LT 에이전트]  │
 "송승기 FIP"  "나균안 폼"    │
     └────┬────┘             │
    [심판 에이전트] ←─────────┘
     양쪽 논거 + v1.5 정량 모델
     + 회고 보정 힌트
           │
     최종 확률 + reasoning
```

## 디렉토리 구조

```
docs/
├── retros/         ← 사이클별 회고 (Compound)
├── solutions/      ← 안티패턴 + 해결책 (Compound)
└── agents/         ← 에이전트 문서 (Harness)
```
