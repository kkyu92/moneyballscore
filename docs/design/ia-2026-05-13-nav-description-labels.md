# IA — 네비게이션 description 일관화 + 레이블 명확화

cycle 344 / 2026-05-13 / chain `info-architecture-review`

## 진단 evidence

| trigger | 측정 결과 |
|---|---|
| (8) ia-2026-05-12(cycle 301) 후속 후보 미처리 ≥ 20 사이클 | cycle 301 "헤더 드롭다운 아이콘" → 43 사이클 경과 ✅ |
| ia-2026-05-30(cycle 330) 후속 후보 미처리 | "기록→예측 기록" / "드롭다운 아이콘" / "커뮤니티 링크" 3건 ✅ |

## 현재 문제

### 1. description 불균형

| 그룹 | description 여부 | 패널 스타일 |
|---|---|---|
| AI (3개) | ✅ 있음 | 14rem 설명 패널 |
| 커뮤니티 (2개) | ✅ 있음 | 14rem 설명 패널 |
| 팀·선수 (3개) | ❌ 없음 | 8rem 최소 패널 |
| 리뷰·시즌 (5개) | ❌ 없음 | 2col 그리드 18rem |

팀·선수와 리뷰·시즌이 description 없이 레이블만 나열 → 사용자가 무엇을 찾을 수 있는지 파악 어려움.

### 2. "기록" 레이블 모호성

`{ href: "/predictions", label: "기록" }` — "기록"이 예측 기록인지 팀 기록인지 불명확.
`/predictions`는 날짜별 예측 아카이브. "예측 기록"이 정확.

## 수정

### Header.tsx NAV_ITEMS

**"기록" 레이블 명확화**:
```
{ href: "/predictions", label: "예측 기록" }
```

**팀·선수 그룹 description 추가**:
```
items: [
  { href: "/teams", label: "팀", description: "KBO 10구단 프로필·통계" },
  { href: "/players", label: "선수", description: "선수 세이버메트릭스 지표" },
  { href: "/matchup", label: "매치업", description: "팀간 맞대결 이력 분석" },
]
```

**리뷰·시즌 그룹 description 추가**:
```
items: [
  { href: "/reviews", label: "예측 리뷰", description: "주간·월간 예측 총평" },
  { href: "/reviews/weekly", label: "주간 리뷰", description: "이번 주 예측 성과 분석" },
  { href: "/reviews/monthly", label: "월간 리뷰", description: "월별 적중률 트렌드" },
  { href: "/reviews/misses", label: "빗나간 예측", description: "오답 원인 factor 분석" },
  { href: "/seasons", label: "시즌 기록", description: "연도별 성과 아카이브" },
]
```

### 렌더링 변화

NavLinks.tsx의 패널 스타일 조건: `sub.description 있음 → min-w-[14rem] 설명 패널`

- 팀·선수: 8rem 최소 → 14rem 설명 패널 (description 추가)
- 리뷰·시즌: 2col 그리드 18rem → 14rem 설명 패널 (description 추가 + 그리드 해제)

5개 리뷰·시즌 항목이 단일 컬럼으로 나열 → 스크롤 없이 표시 가능.

## 검증

- `pnpm type-check`: PASS
- `pnpm test`: PASS (UI 변경만, 기능 변경 없음)
- 헤더 "팀·선수 ▾" hover → 설명 패널 표시
- 헤더 "리뷰·시즌 ▾" hover → 단일 컬럼 설명 패널
- 헤더 "예측 기록" 링크 → /predictions

## 다음 cycle 후속 후보

- 드롭다운 항목에 SVG 아이콘 추가 (각 항목 앞 카테고리 아이콘) — 별 cycle scope
- 헤더 메가메뉴 전환 (전체 그리드 hover panel) — 큰 scope
