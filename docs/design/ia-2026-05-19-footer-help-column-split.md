# Footer 도움말 컬럼 신설 (cycle 656)

## 진단

cycle 655 Header NAV_ITEMS 에 "도움말" group (methodology + guide) 신설했지만 Footer SITEMAP_COLUMNS 에 동기 안 됨. "리뷰·서비스" 컬럼이 8 entry 비대 (reviews / reviews/misses / seasons / search / about / guide / methodology / glossary).

## 변경

`apps/moneyball/src/components/layout/Footer.tsx`:

- "리뷰·서비스" 컬럼 8 → 4 entry: reviews / reviews/misses / seasons / search
- "도움말" 신규 4 entry: methodology / guide / glossary / about
- grid `grid-cols-2 sm:grid-cols-4` → `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` (5 컬럼 반응형)

## 의도

도움말 4 entry 를 별도 컬럼으로 분리. 사용자가 (1) 모델 설명 → methodology (2) 사용법 → guide (3) 용어 → glossary (4) 서비스 소개 → about 한 컬럼에서 path 명확. cycle 655 Header 자연 후속 동기.

## 다음 cycle 후속 후보

- Header NAV_ITEMS "도움말" group 도 4 entry 확장 (glossary + about 추가) — cycle 655 는 mega menu width 안전 2 entry 박제. 확장 시 nav-icon "book"/"info" 신규 정의 필요
- Footer "팀·선수" 컬럼 4 entry / "커뮤니티" 2 entry — 균형 재편 (lg 5 col 그리드 안 표현)

## 후속 처리 박제 (cycle 709, 2026-05-19)

cycle 709 info-architecture-review chain (lite verify mode) 진단 결과 위 2건 모두 처리 확인:

| 후속 | 처리 cycle | 검증 |
|---|---|---|
| Header NAV_ITEMS "도움말" group 4 entry 확장 | (점진적, cycle 656~708 사이) | `Header.tsx` NAV_ITEMS "도움말" group = methodology / guide / glossary / about 4 entry 박제. nav-icon "file-text" / "clipboard-check" / "database" / "file-text" 매핑. |
| Footer "팀·선수" 4 / "커뮤니티" 2 균형 | (점진적, cycle 656~708 사이) | `Footer.tsx` SITEMAP_COLUMNS 5 column: AI 예측 5 / 커뮤니티 2 / 팀·선수 4 / 리뷰·시즌 5 / 도움말 5. 커뮤니티 2 entry 의도 박제 (작은 그룹 mental model 명확) — 균형 재편 자연 처리. |

본 spec close — trigger 8 (carry-over ≥ 20 사이클) 후보 X.
