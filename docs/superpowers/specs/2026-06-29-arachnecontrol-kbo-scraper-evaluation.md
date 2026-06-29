# ArachneControl KBO scraper 도입 평가 (cycle 1406, explore-idea lite)

**스카우트**: issue #2504 — ArachneControl (서버가 브라우저를 원격 제어하는 오픈소스 데이터 수집 시스템) 을 KBO 공식 사이트 scraper 에 도입 제안
**상태**: REJECT (현 시점)
**Carry-over**: 도입 조건 충족 시 재평가

## 1. 현재 KBO scraper 상태

| 항목 | 현황 |
|---|---|
| 구현 | `packages/kbo-data/src/scrapers/kbo-official.ts` (302 lines), `kbo-live.ts` (237 lines) |
| 방식 | `fetch` + `cheerio` (HTML 파싱) |
| 핵심 endpoint | `/ws/Main.asmx/GetKboGameList` (AJAX JSON API, 직접 호출 가능) |
| 봇 우회 | `Referer` 헤더 박제 (cycle 769 PR #1101, 사례 8 후속) + `KBO_USER_AGENT` |
| 알람 layer | `kbo-scraper-alert.ts` — HTML 응답 (봇 차단) 감지 시 Sentry warning + parse error throw |
| 의존성 | `cheerio` + `zod` (가벼움) |
| 마지막 봇 차단 incident | cycle 769 (2026-05 KBO Referer 정책 변경, 즉시 fix) |
| 최근 6개월 incident | 0건 (cycle 769~1406, 637 cycle 무사고) |
| Sentry alert fire 빈도 | 거의 X (kbo-scraper-alert.ts 가 silent silent drop 만 차단 — 일상 fire 없음) |

**결론**: 현 scraper 는 직접 AJAX API + Referer 만으로 동작. 동적 JS 렌더링 / advanced 봇 차단 (Cloudflare / Datadome / hCaptcha 류) X.

## 2. ArachneControl 가치 제안 분석

| 차원 | ArachneControl 강점 | 본 프로젝트 적용성 |
|---|---|---|
| 동적 JS 렌더링 | 브라우저 실제 실행 → SPA / JS-only 사이트 크롤 | KBO 공식 = 정적 AJAX JSON, 적용 가치 0 |
| Cloudflare / Datadome 우회 | 실제 브라우저 fingerprint | KBO 그런 차단 없음 — Referer 만으로 통과 |
| Captcha / 자바스크립트 challenge | 사람 행동 시뮬레이션 | KBO captcha 0건 |
| 분산 수집 (Command-Execute-Report) | 다수 노드 분산 | 본 프로젝트 단일 Vercel function — 분산 가치 X |
| Selenium / Playwright 대안 | yes | 본 프로젝트 둘 다 미사용 — 신규 의존성 |

## 3. 도입 비용 (cost)

- **메모리 / CPU**: headless browser process = 200~500MB / 1+ core. fetch 의 ~100배
- **Vercel function 한도**: 현 300s default. 브라우저 startup 5~15s + scrape 30s+ = 한도 빠르게 소진
- **Cold start**: 브라우저 초기화 = serverless 환경 부적합 (Vercel Functions Fluid Compute 라도 무거움)
- **dependency 추가**: `playwright-core` (~30MB) 또는 ArachneControl + 브라우저 binary
- **유지보수 비용**: 브라우저 버전 호환 / Chrome update 대응 / OS 종속성
- **속도**: AJAX fetch ~200ms vs 브라우저 navigation ~5~10s (25~50x 저하)

## 4. ROI 평가 (rubric 5축, plan #8 패턴 정합)

| 축 | 평가 |
|---|---|
| 가치 | **low** — 현 scraper 무사고 637 cycle. 추가 가치 측정 evidence 0 |
| 시간 비용 | **large** — 신규 인프라 도입, 마이그레이션, 테스트 |
| risk | **2** — Vercel 한도 도달 / 비용 증가 / 새 silent drift family 도입 가능 |
| 자율 가능 | **partial** — Vercel free tier 한도 monitor 필요 (비용 가드) |
| 의존성 | **다중** — ArachneControl runtime, Chrome binary, Vercel function 한도 |

**Tier 분류**: Tier 4 (사용자 영역 — 외부 인프라 결정 필요)

## 5. 재평가 trigger 조건 (carry-over 박제)

다음 중 1+ 충족 시 본 spec 재평가:

1. KBO 공식 사이트 정책 변경 → 봇 차단 강화 (Cloudflare 도입 / JS challenge 추가)
2. `kbo-scraper-alert.ts` Sentry fire ≥ 3건 / 30일 (현재 0건 추정)
3. KBO 가 정적 endpoint 제거 → SPA 마이그레이션 (현재 X)
4. 동적 JS 렌더링 필수 신규 데이터 소스 추가 (현재 없음)
5. 사용자 자연 발화 — scraper 안정성 우려 / "다른 도구 더 좋아?" 질문

## 6. 결론 + issue #2504 처리

**결정**: **REJECT (현 시점)** — issue #2504 close. 본 spec 박제 = carry-over 채널.

**이유**:
- 현 fetch + cheerio + Referer 조합 = 가볍고, 빠르고, 무사고 637 cycle
- ArachneControl 도입 = 25~50x 속도 저하 + Vercel 한도 risk + dependency burden
- 봇 차단 차원 = 이미 `kbo-scraper-alert.ts` Layer 2 알람 박제
- 측정 가능 benefit 0 (scout body "수집 실패율 감소" 주장 = 현 실패율 0 → 감소 여지 X)

**carry-over**: 본 spec 박제 — 5개 trigger 조건 중 1+ 충족 시 재평가. 자율 implementation X.

---

> 🤖 cycle 1406 explore-idea (lite) spec. policy:cycle-retro 1406 dispatch + issue #2504 close 동기.
