---
status: draft-for-user-review
target_chain: explore-idea (lite)
cycle_n: 433
issue: 468
expiry: 2026-06-15
---

# Sentry 관측 + PII 스크러빙 재검토 — 데이터 주권 평가

## 배경

- issue #468 (Scout, 2026-05-15): "내 디지털 스택을 유럽으로 옮겼다" 기사 관련도 high. moneyballscore Sentry/PII 로직 재검토 + 대체 솔루션 PoC 평가 요청.
- 드리프트 사례 6 (2026-04-19): Sentry P3 가드 B 테스트가 PII 스크러빙 5건 silent 버그 폭로. 그 후 sentry-scrub.ts (87 LOC) 도입 + beforeSend 훅 강제 + DO_NOT_TRACK/GPC 옵트아웃 + 가드 B 회귀 테스트.
- 본 spec = 외부 dependency (Sentry SaaS) 의 데이터 주권 risk 평가 + 대안 4종 비교 + 권장.

## 현 상태 (2026-05-15 기준)

| 영역 | 위치 | 비고 |
|---|---|---|
| 진입점 server | `apps/moneyball/src/instrumentation.ts` (32 LOC) | 모듈 로드 시 즉시 init + register fallback. captureRequestError onRequestError export |
| 진입점 client | `apps/moneyball/src/instrumentation-client.ts` (36 LOC) | DO_NOT_TRACK / GPC 옵트아웃 / replaysOnErrorSampleRate 0.1 |
| PII 스크럽 | `apps/moneyball/src/sentry-scrub.ts` (87 LOC) | 40+ SENSITIVE_KEYS / beforeSend / user 표준 4필드 강제 / 깊이 20 walk |
| 빌드 통합 | `apps/moneyball/next.config.ts` `withSentryConfig` | sourcemap 업로드 + auth token (.env.local SENTRY_AUTH_TOKEN) |
| 회귀 테스트 | 가드 B (stripe/customer_id/discord_id PII 누출 회귀) | 드리프트 사례 6 후속 |
| Dep | `@sentry/nextjs ^10.49.0` | v10+ instrumentation-client.ts 자동 로드 |

**SENSITIVE_KEYS 커버 영역**: 자격 (password/token/api_key/jwt) / 식별자 (email/phone/user_id/ip_address) / 결제 (stripe/customer_id) / 프로필 (username/display_name) / 외부 ID (discord_id/slack_user_id/webhook_url) / Supabase auth.

## 데이터 주권 risk 평가

| 차원 | 현 상태 | risk |
|---|---|---|
| 데이터 위치 | Sentry SaaS (US, EU 옵션 별도) | 외부 SaaS — 위치 통제 X (현재 US default). 한국 사용자 데이터 외부 전송 |
| 데이터 통제 | 코드 레벨 beforeSend + DSN 제거 시 즉시 no-op | High — 자체 controlled |
| PII 스크럽 적용 | server + client + 깊이 20 + 가드 B 테스트 | High — 회귀 차단 |
| 사용자 옵트아웃 | DO_NOT_TRACK + GPC 표준 | High — 브라우저 단 거부 자동 존중 |
| 비용 | Sentry Free tier (5k events/month) | Low — 현 traffic 충분 |
| 외부 종속 | Sentry SDK + Sentry SaaS 양쪽 | Medium — SaaS 단절 시 fallback X |

**핵심 risk**: 데이터 위치 (US) + 외부 종속. PII 스크럽 자체는 강건.

## 대안 비교 (4종)

| 대안 | 데이터 위치 | 통제 | 비용 | 마이그레이션 부담 | 권장도 |
|---|---|---|---|---|---|
| **현행 Sentry SaaS US** | US | beforeSend 코드 강제 | $0 (free tier) | - | ✅ 현 |
| Sentry EU 리전 전환 | EU | 동일 | $0 | DSN 교체만 (저) | ⚠️ 부분 개선 |
| GlitchTip 자체 호스팅 | 우리 인프라 | 완전 | Vercel/VPS 호스팅 비용 + 운영 부담 | sentry SDK API 호환 (중) | △ tradeoff |
| Sentry self-host | 우리 인프라 | 완전 | Docker compose 무거움 + 유지 부담 | DSN 교체만, 그러나 운영 비용 (고) | ✗ overkill |
| 관측 제거 + 로그 only | Vercel 로그 only | 완전 | $0 | beforeSend / 스크럽 / sourcemap 제거 (저) | ✗ 가드 B 회귀 X |

**근거**:
- GlitchTip = OSS Sentry 호환. Django 기반. Docker self-host. UI Sentry-similar. 데이터 주권 ✓. 단점: 운영 부담 + 가용성 본인 책임 + sourcemap 처리 별도.
- Sentry EU 리전 = 가장 가벼운 개선 (DSN 1개만 교체). 데이터는 여전히 외부 SaaS 지만 GDPR/EU 관할로 이전. **PII 스크럽이 코드 레벨이므로 데이터 누출 risk 차이는 낮음**.
- Self-host Sentry = 운영 무거움. 단일 개발자 프로젝트 ROI 부족.
- 관측 제거 = 가드 B 후속 보장 X. silent 회귀 차단 인프라 손실. 권장 X.

## 권장

**즉시**: 현행 유지. Sentry SaaS US + sentry-scrub.ts 강건. 데이터 주권 risk 는 PII 스크럽 코드 강제로 mitigated.

**옵션 A — Sentry EU 리전 전환** (가장 가벼움):
- DSN 1개 교체 (Sentry org settings → EU). 코드 변경 0.
- 데이터 위치 EU 이전 → GDPR 관할 + 한국→EU 전송 (US 보다 사용자 신뢰 ↑).
- 부담: 즉시 가능.

**옵션 B — GlitchTip self-host PoC** (큰 부담):
- Cloudflare Workers 또는 Fly.io 에 Docker 호스팅.
- sentry SDK DSN URL 만 교체.
- 부담: 운영 + 가용성 + DB (Postgres) + sourcemap 별도 처리. 1~2주 spec + 1주 실험.
- **권장 X** (단일 개발자 ROI 부족, 현 sentry-scrub.ts 가 이미 PII 강제).

**옵션 C — 보강만 (현 setup 유지 + 추가)**:
1. 가드 B 테스트 확장 — Sentry SaaS 가 받은 payload 실제 fetch 후 검증 (지금은 발송 직전 코드 레벨만 검증).
2. SENSITIVE_KEYS 정기 감사 — git history 측정 후 새 PII 후보 patten 발견 시 추가 트리거.
3. `sentry-scrub.ts` 의 `scrubObject` walk 가 `event.request` / `event.breadcrumbs` 도 커버하는지 확인 후 누락 시 추가.

## 결정 carry-over (사용자 결정 항목)

1. Sentry US → EU 전환 진행? (Y/N)
2. GlitchTip PoC 진행? (Y/N) — 권장 X
3. 옵션 C 보강안 (3개 항목 중) 진행할 것 선택?
4. 본 spec 1개월 후 (2026-06-15) 재평가 / archive?

## 다음 cycle 후속 후보

- Y/A 선택 시: Sentry EU DSN 교체 + 가드 B 테스트 EU 환경 재검증
- Y/B 선택 시: GlitchTip self-host PoC 별도 spec 작성 → expand-scope chain 진입
- Y/C 선택 시: sentry-scrub.ts `event.request` / `event.breadcrumbs` 커버 확인 + 누락 시 review-code (heavy) chain 진입

## 측정 후속 (선택 무관 진행)

cycle 433+5 (= cycle 438) 시점 본 spec 의 사용자 결정 항목 진행도 측정. 결정 부재 시 expire 처리 (2026-06-15).
