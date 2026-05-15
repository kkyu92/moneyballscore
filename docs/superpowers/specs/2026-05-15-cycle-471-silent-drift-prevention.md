# Silent drift family 자동 탐지 prevention infra

**Cycle**: 471
**Chain**: explore-idea (lite)
**Trigger**: 2-chain alternation lock (review-code 7 + polish-ui 1, distinct=2) + improvement saturation 14/15
**Outcome**: partial (spec only, 사용자 review 대기)
**Carry-over evidence**: silent drift family streak 17 cycle (454~470)

## 1. 배경

cycle 454~470 = 17 cycle 연속 review-code (heavy) 또는 polish-ui (lite) SUCCESS streak. 모두 같은 family — **단일 source 통합** 작업:

| Cycle | 영역 | 통합 target |
|---|---|---|
| 454, 456 | DESIGN.md token | brand-500/600 / red-* tokens |
| 455 | 코드 dedupe | buildPicksStats.ts |
| 457 | KST 월요일 boundary | @moneyball/shared 단일 source |
| 459, 461 | fix-incident | fallback 라벨 / API 에러 분류 |
| 460, 463 | UI fix | FallbackTrendChart / Telegram summary |
| 464, 465 | helper dedupe | classifyVersion / build*Review |
| 466 | helper extract | evaluateAndCaptureAgentFallback |
| 467, 470 | 매직 넘버 단일 source | HOME_ADVANTAGE (0.015 / 0.515 / 51.5% / "1.5%p") |
| 468 | helper 단일 source | errMsg (41 곳) |
| 469 | weight 라벨 단일 source | DEFAULT_WEIGHTS 카드 표시 |

**메타 패턴**: 코드 곳곳 흩어진 매직 넘버 / 하드코딩 string / 중복 helper / DESIGN.md token 들을 review-code heavy chain 이 매 cycle 새 grep 으로 발견 → 단일 source 통합. **사후 발견 사이클당 1개**.

**문제**: silent drift 가 매주 자연 누적. review-code chain 17 cycle 째 발화여도 잔여 drift 여전히 존재 추정 (`cycle 470 next_rec` 가 매번 새 후보 명시). 사후 grep 의존 = 비효율.

## 2. 가설

drift 발생 시점에 **자동 탐지 + 차단** 가능하면 review-code chain 발화 빈도 자연 감소 + 다양성 회복.

## 3. spec scope

### Scope A — 매직 넘버 detection ESLint rule (P1)

**대상 매직 넘버 list** (이미 단일 source 존재):

```
0.015           → HOME_ADVANTAGE
0.515 / 51.5%   → HOME_ADVANTAGE 파생 (50% + 1.5%p)
"1.5%p"         → HOME_ADVANTAGE 표시 문자열
0.55 (Sunday cap)  → SUNDAY_CONFIDENCE_CAP
```

**rule**: 위 숫자 / 문자열 grep 시 코드 안 등장하면 ESLint error (`@moneyball/shared` import 강제). 예외: 단일 source 정의 파일 자체.

**구현 위치**: `eslint.config.js` custom rule 또는 `no-restricted-syntax` literal match.

### Scope B — DEFAULT_WEIGHTS 라벨 자동 동기화 (P2)

**대상**: 분석 방법론 카드 (홈 page.tsx 6개 카드 + /about + /debug/factor-correlation 등).

**rule**: weight 라벨 (예 `"최근폼 + 상대전적 15%"`) 하드코딩 금지. `DEFAULT_WEIGHTS.recent_form + DEFAULT_WEIGHTS.head_to_head` 합산 → 자동 표시.

**검증**: jest snapshot 또는 grep CI — 카드 컴포넌트 안 `\d+%` 정규식 match 시 fail.

### Scope C — errMsg helper 강제 (P3)

**대상**: 41 곳 (cycle 468 통합). 신규 코드에서 `e instanceof Error ? e.message : String(e)` 패턴 재등장 차단.

**rule**: ESLint `no-restricted-syntax` — `BinaryExpression[operator='instanceof']` + Error 매칭 + ternary 조합 detect → `errMsg(e)` import 권장.

### Scope D — DESIGN.md token grep CI (P2)

**대상**: Tailwind class 안 `green-*` / `red-*` / `emerald-*` 직접 사용 차단. DESIGN.md 박제 brand-* / success-* / error-* token import 강제.

**rule**: pre-commit hook 또는 CI grep — `.tsx` 안 raw Tailwind color class match 시 fail. allow list = layout / debug.

### Scope E — KST boundary 단일 source 강제 (P3)

**대상**: cycle 457 통합 후 신규 코드에서 `dayjs().tz('Asia/Seoul')` 분기 조건 재등장 차단.

**rule**: ESLint custom — `tz('Asia/Seoul')` 호출 시 `@moneyball/shared` 모듈에서만 허용.

## 4. 자율 결정 사항 (autoplan_decisions)

- **A 우선**: 매직 넘버는 가장 빈번 (HOME_ADVANTAGE 만 4 cycle 차지). lint rule = 가장 ROI 높음.
- **D 우선**: DESIGN.md token 은 cycle 454/456 이미 2번 — 잔여 drift 추정. CI grep 빠른 win.
- **B/C/E 후속**: 효과는 명확하나 lint rule 복잡도 ↑. P2/P3 분리.
- **mode**: lite (자동 fire 환경 hang 회피, 사용자 review 후 heavy 진행)

## 5. 후속 cycle 후보

- **다음 cycle (heavy explore-idea 또는 fix-incident)**: Scope A 또는 Scope D 단일 PR 구현
- **그 다음 cycle**: 잔여 scope 순차

## 6. 사용자 review 포인트

- Scope A/D 가 review-code chain 빈도 자연 감소 시키는지 (다음 20 cycle 동안 review-code 발화 빈도 측정)
- ESLint rule maintenance 비용 vs review-code heavy chain 발화 비용 tradeoff
- silent drift "사후 발견" 가 의외로 자연스러운 정리 path 일 수 있음 (lint rule 미도입 가설)
