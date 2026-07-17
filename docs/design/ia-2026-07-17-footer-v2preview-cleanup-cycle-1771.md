# IA Review: Footer /v2-preview 제거 + /insights AI 예측 이동 (wave-418)

**cycle**: 1771
**date**: 2026-07-17
**trigger**: 2-chain alternation lock (explore-idea↔review-code 8사이클) + cycle 1727/1749 ia spec "다음 cycle 후속 후보" 이행

## 진단

### 2-chain alternation lock 탐지
직전 8 사이클: explore-idea 4회 + review-code 4회 (distinct=2 → lock trigger).
explore-idea + review-code 제외 → info-architecture-review 선택.

### 발견된 IA 이슈
- Footer "도움말": `/v2-preview` (v2 시뮬레이션 미리보기) — `robots: { index: false }` 명시, v2.1-B rejected 후 stale. 공개 sitemap 부적합
- Footer "도움말": `/insights` — 헤더 "예측·기록" 그룹에 이미 편입 (cycle 1727), "도움말" 컬럼 semantic 불일치
- Footer 와이어프레임 주석 stale (`/v2-prev.` 잔존)

### cycle 1727/1749 spec 후속 이행
- cycle 1727 (insights-nav): "footer '도움말' 컬럼 정리: v2-preview, v2-shadow-monitor 필요성 재검토"
- cycle 1749 (reviews-header-nav): 동일 후속 언급

## 변경 사항

### Footer.tsx
- 제거: "도움말" → `/v2-preview` "v2 시뮬레이션 미리보기"
- 이동: "도움말" → `/insights` 제거 → "AI 예측" 컬럼 추가
- 유지: "도움말" → `/v2-shadow-monitor` (공개 transparency dashboard, indexed)
- 유지: "도움말" → `/accuracy/shadow` (헤더 제거 후 footer-only, wave-384)

### v2-preview-routes.test.ts
- Footer 미포함 assertion 으로 방향 전환 (noindex 공개 sitemap 제외 정합)

## 결과
- 2556/2556 tests green
- "AI 예측" 컬럼: 7 items (/, /analysis, /accuracy, /dashboard, /insights, /predictions, /calendar)
- "도움말" 컬럼: 8 items (method./guide/glossary/v2-shadow-mon./acc/shadow/changelog/about/search)

## 다음 cycle 후속 후보
- v2-shadow-monitor 장기 유지 필요성 재검토 (v1.8 유지 확정 이후 era 비교 데이터 stale 속도 monitor)
- v2-preview 페이지 자체 archive 여부 (현재 noindex 유지, 페이지 삭제는 별도 결정)
- Footer "AI 예측" 컬럼 7 items = 최대 길이 — 신규 AI 기능 추가 시 컬럼 분리 검토
