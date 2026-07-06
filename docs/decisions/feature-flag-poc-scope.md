# Decision 1-pager: feature flag PoC scope — Vercel Flags SDK + Edge Config

**Status**: SUPERSEDED — 2026-07-06 (cycle 1466, silent drift family wave 199)
**Closure**: v1.8 유지 확정 (cycle 1460) — v2.0 production rollout 미진행. feature flag canary rollout 필요성 소멸. 신규 모델 버전 결정 시 재평가.
**Original Status (2026-05-29)**: pending user decision
**Created**: 2026-05-29 (cycle 1032 plan #17 — scout #1370 carry-over)
**Owner**: 사용자 (kyusikkyu@gmail.com)
**Linked**: `~/.develop-cycle/plans/moneyballscore/17.md`, scout #1370, `docs/research/v2.0-killswitch.md`
**Decision timing**: ~~v2.0 ship 결정 시점 전 (n=150 ETA 2026-08-04 또는 kill-switch fire ETA 2026-06-15 중 빠른 시점) — 2026-06-15 권장 deadline~~ (superseded)

## 결정 요청

v2.0 후보 가중치 ship 시점에 0%→100% binary switch 만 가능한 현 상태에서, **canary 10%/50% gradual rollout layer** 박제 여부 결정. 도입 방식 3 option:

- **(A) Vercel Flags SDK + Edge Config** ← 1순위 추천
- **(B) PostHog feature flags**
- **(C) Unleash self-hosted**

본 1-pager = 사용자 결정 wait. 본 메인 자율 결정 X.

## (A) Vercel Flags SDK + Edge Config — 1순위 추천

### Data layer
- `@vercel/flags` SDK + `@vercel/edge-config` storage
- Edge Config = key/value store, 60s 갱신 latency, Vercel dashboard 또는 API 박제
- 본 워커 Vercel 호스팅 환경 정합 (외부 infra 추가 X)

### Cost
- **Hobby**: Edge Config 1 free + 1MB storage + 200K read/month
- **Pro**: $0.001 per 1K read + $0.10 per 1K write (현 Pro plan 시점)
- 본 워커 추정 read 부하: 일 ~50 read (predict cron 일 1회 fire + shadow cohort 추가) = 월 ~1.5K read = **월 $0.0015 ≈ free tier 안**
- 추가 cost 부재 = cost guard 정합 (CLAUDE.md "외부 SaaS 자율 결제 시도 절대 X")

### 통합 path
- `pnpm add @vercel/flags @vercel/edge-config`
- `apps/moneyball/src/lib/flags.ts` 신규 — wrapper (Edge Config read + fallback default + silent fail 차단 warning log)
- PoC slug 2개: `model-version-v20-rollout` (number 0~100) + `lotto-hub-published` (boolean)
- 환경변수: `EDGE_CONFIG` (Vercel auto-injected when Edge Config attached to project)

### 사용자 영역 setup (Step A SDK 통합 PoC 전제)
1. Vercel dashboard → moneyballscore project → Storage → Edge Config Create
2. slot 명 자동 박제 (예: `ecfg_abc123`)
3. Project 에 Edge Config attach → `EDGE_CONFIG` env 자동 박제
4. slug 2개 박제 (initial value): `model-version-v20-rollout: 0`, `lotto-hub-published: false`

### 작업 cost
- SDK 통합 + smoke test = **1 PR (~150 LOC)**
- 별도 plan #17 carry-over Step A 로 ship (사용자 결정 후 fire)

## (B) PostHog feature flags

### Data layer
- PostHog Cloud (또는 self-host) + `posthog-js` SDK + `posthog-node` SDK
- feature flag + A/B test + analytics 통합 (event 추적 + funnel)

### Cost
- Cloud free: 1M event/month + unlimited feature flag
- Cloud paid: $0.00005 per event after 1M
- self-host: 무료 (인프라 cost 본인 부담)

### 통합 path
- `pnpm add posthog-js posthog-node`
- analytics 통합 = 별도 layer (현 워커 analytics 별도 PostHog 사용 X)
- analytics 미사용 환경 시 feature flag-only PostHog = 과적 (analytics 풀세트 도입 부담)

### 추가 cost
- analytics layer 통합 작업 추가 = **2 PR (~300 LOC)**
- 외부 SaaS 의존 = cost guard 정합 검증 필요 (free tier 안 유지 가능 시 OK)

## (C) Unleash self-hosted

### Data layer
- Unleash 자체 호스팅 (Docker 또는 Vercel 별도 deploy)
- feature flag + strategy + variant + analytics

### Cost
- 무료 (인프라 cost 본인 부담)
- 본 워커 추가 infra layer 박제 = 추가 maintenance cost

### 통합 path
- Unleash server 배포 (별도 Vercel project 또는 외부 호스팅)
- `pnpm add unleash-client` SDK 통합

### 추가 cost
- 별도 infra 운영 = **2~3 sprint** (배포 + 모니터링)
- self-host = silent fail risk (Unleash server down 시 fallback default)

## 비교 표

| 차원 | (A) Vercel Flags | (B) PostHog | (C) Unleash self-hosted |
|---|---|---|---|
| Vercel native | ✓ | ✗ | ✗ |
| 외부 SaaS 의존 | ✗ (Vercel 자체) | ✓ (PostHog) | ✗ (self-host) |
| cost (월) | $0 (Hobby) ~ $0.01 (Pro) | $0 (free tier) | $0 + infra |
| 통합 LOC | ~150 | ~300 (analytics 풀세트) | ~300 + infra deploy |
| 작업 sprint | 1 | 2 | 2~3 |
| 갱신 latency | 60s (Edge Config) | 30s (default) | 즉시 (self-host) |
| analytics 통합 | ✗ (별도) | ✓ (built-in) | ✗ (별도) |
| commitment escalation risk | 낮음 (Vercel 의존) | 중간 (SaaS lock-in) | 높음 (self-host maintenance) |
| 사용자 가시 가치 | v2.0 safe rollout | + analytics funnel | v2.0 safe rollout |

## 추천 (본 메인 시각, 사용자 결정 wait)

**1순위**: (A) Vercel Flags SDK + Edge Config

이유:
1. Vercel native = 외부 SaaS lock-in 회피
2. 본 워커 호스팅 환경 정합 (인프라 추가 X)
3. cost guard 정합 (월 $0 ~ $0.01, free tier 안)
4. 통합 cost 최소 (~150 LOC, 1 PR)
5. v2.0 rollout 시간 spec 정합 (cron 일 1회 fire vs 60s latency = 무관)

**2순위**: (B) PostHog — analytics 풀세트 별도 도입 시점에 재검토 (현 시점 feature flag-only = 과적)

**3순위**: (C) Unleash — self-host 운영 부담 + 본 워커 infra 추가 가치 부재

## 사용자 결정 후 carry-over

(A) 선택 시 carry-over action:
1. Vercel Edge Config slot 생성 (사용자 영역, 5분)
2. PoC slug 2개 박제 (initial value)
3. plan #17 Step A SDK 통합 PoC PR fire (본 메인 자율, 1 sprint)
4. v2.0 ship 결정 시점 (n=150 또는 kill-switch fire) rollout protocol fire — `docs/research/v2.0-killswitch.md` 박제 path 정합

(B) / (C) 선택 시 carry-over 별도 plan TBD 박제 (본 plan 폐기 또는 hold). 박제 시점 plan number 가정 X — 실제 박제 시점 next-available number 결정 (plan #18 = 외부 인프라 모니터링으로 별도 박제됨, 사례 정합).

## 자가 의심 (plan #8 패턴 정합)

- 본 결정 fire 시점 = v2.0 ship 결정 시점 전 layer. ship 결정 시점 도달 (n=150 ETA 2026-08-04) 전 PoC ship = 무용 risk → lite scope (1-pager + plan only) 강제
- 외부 paid SaaS (LaunchDarkly $$) 옵션 평가 X — cost guard 정합 (CLAUDE.md "외부 SaaS 자율 결제 시도 절대 X")
- PoC slug 2개 (`model-version-v20-rollout` / `lotto-hub-published`) = 실제 사용 시점 별도 carry-over plan 박제 (본 plan = 통합 layer only)
- 사용자 결정 wait 가 단일 stop 신호 — 본 메인 자율 SDK 통합 ship X (사용자 영역 setup 전제 부재)
