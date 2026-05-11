# Scraper Bot Detection Risk Assessment & Mitigation Spec

**작성**: cycle 283 explore-idea lite (2026-05-12)
**트리거**: GH issue #244 (Camofox Browser scout article) + improvement saturation
**관련 이슈**: #244

---

## 현황 요약

### 스크래퍼 별 봇 탐지 위험 분류

| 스크래퍼 | 대상 | 방식 | 현재 UA | 위험도 |
|---|---|---|---|---|
| `kbo-live.ts` | koreabaseball.com AJAX | JSON API (POST) | custom | **낮음** — API endpoint, JS 불필요 |
| `kbo-official.ts` fetchGames | /ws/Main.asmx/GetKboGameList | JSON API | custom | **낮음** — API endpoint |
| `kbo-official.ts` fetchRecentForm | /Record/TeamRank/TeamRankDaily.aspx | HTML + Cheerio | `MoneyBall/1.0` | **중간** — HTML 페이지 |
| `kbo-official.ts` fetchHeadToHead | /Record/TeamRank/TeamRankVs.aspx | HTML + Cheerio | `MoneyBall/1.0` | **중간** — HTML 페이지 |
| `kbo-official.ts` fetchStandings | /Record/TeamRank/TeamRankDaily.aspx | HTML + Cheerio | `MoneyBall/1.0` | **중간** — HTML 페이지 |
| `kbo-pitcher.ts` | /Record/Player/PitcherBasic/Basic1.aspx | HTML + Cheerio | `MoneyBall/1.0` | **중간** — HTML 페이지 |
| `fancy-stats.ts` | kbofancystats.com/leaders/ | HTML + Cheerio | `MoneyBall/1.0` | **낮음** — robots.txt 없음 (공개 허용) |
| `fangraphs.ts` | fangraphs.com/leaders/international/kbo | HTML + Cheerio | `MoneyBall/1.0` | **중간** — 보조 소스, 별도 robots.txt |
| `naver-schedule.ts` | sports.naver.com API | JSON API | Accept만 | **낮음** — JSON API |
| `naver-record.ts` | m.sports.naver.com API | JSON API | `Mozilla/5.0...` | **낮음** — 브라우저 UA + Referer 사용 |

### 현재 상태

- CI 전체 **SUCCESS** (2026-05-11 기준)
- 실제 봇 탐지로 인한 scraper 실패: **0건** (pipeline_runs 정상)
- DELAY_MS = 2000ms (rate limiting 준수)
- KBO 공식 HTML 페이지들은 현재 `MoneyBall/1.0 (KBO Prediction Engine)` UA로 정상 동작 중

---

## Camofox Browser 평가

**GH issue #244**: 긱뉴스 스카우트가 자동 생성한 제안. Camofox는 AI 에이전트용 스텔스 헤드리스 브라우저.

### 현재 필요한가?

**아니오.** 이유:

1. **API-first 아키텍처**: KBO 주요 엔드포인트(`GetKboGameList`, 라이브 스코어)는 이미 JSON API. JS 실행 불필요.
2. **HTML 스크래퍼 현황**: KBO 공식 HTML 페이지는 서버 렌더링 정적 HTML. JS 없이 Cheerio로 파싱 가능.
3. **실제 차단 없음**: 현재 운영 환경에서 봇 탐지로 인한 실패 관찰 없음.
4. **YAGNI 원칙**: 실제 차단 발생 전 헤드리스 브라우저 도입은 오버엔지니어링.
5. **추가 의존성 비용**: Playwright/Camofox = 빌드 시간 증가 + 메모리 부담 + CI 복잡도 증가.

### Camofox가 실제로 필요한 시점

- KBO 공식이 SPA(React/Vue) 마이그레이션 → HTML 렌더링 JS 의존
- HTTP 403/429 응답 반복 (실제 차단 발생)
- 클라이언트 사이드 렌더링만 제공하는 신규 소스 통합 시

---

## 현실적 미티게이션 제안

### 즉시 가능한 개선 (코드 변경 최소, 위험도 낮음)

#### 1. HTML 스크래퍼 UA 개선

현재:
```typescript
export const KBO_USER_AGENT = 'MoneyBall/1.0 (KBO Prediction Engine)';
```

개선 후보:
```typescript
// 브라우저와 동일한 형태 — KBO HTML 스크래퍼 전용
export const KBO_HTML_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
```

- `kbo-official.ts` HTML 엔드포인트, `kbo-pitcher.ts`에만 적용
- JSON API 엔드포인트는 기존 `KBO_USER_AGENT` 유지 (솔직한 bot 식별)
- `naver-record.ts`가 이미 이 패턴 적용 중 (precedent 존재)

**결정 대기**: UA를 솔직하게 유지할지, 브라우저처럼 위장할지는 운영 방침 결정 필요.

#### 2. Referer 헤더 추가 (KBO HTML 페이지)

```typescript
headers: {
  'User-Agent': KBO_HTML_USER_AGENT,
  'Referer': 'https://www.koreabaseball.com/',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
},
```

`naver-record.ts`의 기존 패턴을 KBO HTML 스크래퍼에 확장.

#### 3. 차단 감지 로깅 추가

```typescript
// assertResponseOk 이전 상태 코드 로깅
if (res.status === 403 || res.status === 429) {
  console.error(`[scraper] Bot detection suspected: ${res.status} ${url}`);
  // Sentry 이벤트 트리거 — 운영 알람으로 연결
}
```

실제 차단 시 즉시 감지 → 다음 단계 결정 근거.

---

## 권장 행동

| 우선순위 | 항목 | 필요 시점 |
|---|---|---|
| 지금 X | Camofox/Playwright 도입 | 실제 차단 발생 후 |
| 검토 | HTML 스크래퍼 UA 전략 결정 (솔직 vs 위장) | 사용자 결정 필요 |
| 모니터 | pipeline_runs에서 scraper 오류 패턴 관찰 | 운영 중 자연 감지 |
| 나중 | Referer 헤더 + 차단 감지 로깅 | 첫 403/429 발생 시 |

---

## 다음 cycle 후속 후보

- **UA 전략 결정 후**: `KBO_HTML_USER_AGENT` + Referer 헤더 추가 (fix-incident 또는 polish-ui chain)
- **n=150+ 도달 후**: operational-analysis heavy — v2.0 가중치 확정 (TODOS 참조)
