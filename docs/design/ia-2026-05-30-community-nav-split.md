# IA — AI 그룹 분리: AI(3) + 커뮤니티(2)

cycle 330 / 2026-05-12 / chain `info-architecture-review`

## 진단 evidence

| trigger | 측정 결과 |
|---|---|
| (7) 직전 12 사이클 explore-idea ≥ 5 + info-arch 0 | explore-idea 5회, info-arch 0회 ✅ |
| (8) ia-2026-05-12 후속 후보 미처리 ≥ 20 사이클 | cycle 301 spec → 29 사이클 경과 ✅ |
| (9) 마지막 info-arch ≥ 30 사이클 미발화 | 마지막 cycle 317 (13사이클 전) — 미충족 |

## 현재 문제

cycle 321~329 (픽 리더보드 + 커뮤니티 픽 기능 추가) 이후 AI 그룹이 5개로 성장:
- AI 분석, 적중 기록, 모델 성능 — **AI 투명성** 기능
- 내 픽 기록, 픽 리더보드 — **커뮤니티/참여** 기능

"AI" 레이블 아래 커뮤니티 기능을 넣으면 사용자 멘탈 모델과 불일치. "내 픽 기록"을 찾으려는 사용자가 "AI" 버튼을 클릭해야 한다는 게 비직관적.

## 수정

### Header.tsx NAV_ITEMS

**Before:**
```
오늘 | [AI▾(5)] | 순위 | 기록 | [팀·선수▾(3)] | [리뷰·시즌▾(5)]
AI group: AI분석 / 적중기록 / 모델성능 / 내픽기록 / 픽리더보드
```

**After:**
```
오늘 | [AI▾(3)] | [커뮤니티▾(2)] | 순위 | 기록 | [팀·선수▾(3)] | [리뷰·시즌▾(5)]
AI group: AI분석 / 적중기록 / 모델성능
커뮤니티 group: 내픽기록 / 픽리더보드
```

### Footer.tsx SITEMAP_COLUMNS

"분석·예측" 컬럼 8개 → "AI 예측" 5개 + "커뮤니티" 컬럼 신규:

```
AI 예측: 오늘 경기 / AI 분석 / AI 적중 기록 / 모델 성능 / 예측 기록
커뮤니티: 내 픽 기록 / 픽 리더보드 / 매치업
```

## 검증

- `pnpm type-check`: PASS
- `pnpm test`: PASS
- AI 드롭다운 3개 항목 노출
- 커뮤니티 드롭다운 2개 항목 노출
- 모바일 nav: AI 섹션 + 커뮤니티 섹션 분리 표시
- /picks, /leaderboard isActive 하이라이트 → "커뮤니티" 버튼 bold

## 다음 cycle 후속 후보

- ~~헤더 드롭다운 아이콘 추가 (SVG inline, 각 항목에 카테고리 아이콘)~~ ✅ cycle 350 (PR #366) 완료
- 커뮤니티 그룹에 `/search` 또는 소셜 링크 추가 고려
- ~~`기록` 직접 링크 레이블 → "예측 기록"으로 명확화~~ ✅ cycle 344 (PR #364) 완료

## 후속 처리 박제 (cycle 399, 2026-05-14)

cycle 399 info-architecture-review chain 진단 결과 위 후속 후보 3건 중 2건 처리 확인:

| 후속 | 처리 cycle | 검증 |
|---|---|---|
| 헤더 드롭다운 아이콘 추가 (SVG) | cycle 350 (PR #366) | `Header.tsx` `NavLink.icon` 필드 + 11개 항목 `icon` 박제 |
| `기록` 레이블 → `예측 기록` | cycle 344 (PR #364) | `Header.tsx:33` `{ href: "/predictions", label: "예측 기록" }` 박제 |
| 커뮤니티 그룹에 `/search` 또는 소셜 링크 | 미처리 | trigger 자연 발화 시 진행 |

본 spec 위 2건 close — trigger 8 (carry-over 미처리 ≥ 20 사이클) 처리 항목 더 이상 발화 X. "커뮤니티 그룹에 `/search` 또는 소셜 링크" 1건만 carry-over 잔존.
