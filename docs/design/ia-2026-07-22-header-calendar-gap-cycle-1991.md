# IA — Header megamenu `/calendar` 누락 (cycle 1991)

## 진단

30-cycle gap trigger 충족 (마지막 info-architecture-review = cycle 1959, gap 32) 으로 점검 시작.

검토한 후보 신호 (대부분 false positive):
- breadcrumb 누락 grep 14건 → 실제로는 root page / `/debug/*` (내부 도구, IA 대상 X) / `/login /settings /community` (plan #21 placeholder, 이미 추적 중) / `/reviews/monthly`, `/reviews/weekly` (redirect-only stub, breadcrumb 불필요 — 실제 콘텐츠는 `[month]`/`[week]` 하위 페이지가 이미 보유)
- sitemap.ts vs page.tsx 수 mismatch → sitemap.ts 자체에 exclusion 사유 주석이 이미 박제되어 있어 의도된 결과 (redirect stub 제외)
- 최근 14일 page.tsx mtime 변경 57건 → 대규모 refactor(WEEKDAY_LABELS 등) 부수 효과, 신규 라우트 아님

**실제 발견**: `/calendar` (월별 캘린더, sitemap priority 0.8 daily — `predictions`/`accuracy` 급 우선순위) 가 Footer "예측·기록" 그룹엔 있지만 Header MegaMenu "예측·기록" 그룹엔 없음. 데스크탑 사용자는 헤더만 보고 `/calendar` 진입 경로를 놓침.

## 조치

- `nav-icon.tsx`: `calendar` NavIconName + SVG (rect+구분선, 기존 lucide-style 일관)
- `Header.tsx`: KBO_NAV "예측·기록" 그룹에 `/calendar` 항목 추가 (analysis/accuracy/insights/predictions 사이, dashboard 앞)

## 다음 cycle 후속 후보

- MLB 리그 megamenu 는 이미 소규모(경기·팀/포스트시즌 2그룹)라 calendar 대응 라우트 부재 — 해당 없음
- 없음 (단일 gap, 범위 작음)
