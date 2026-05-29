# Plan #18 — 외부 인프라 장애 방어 + 관측 강화 (1-pager)

**상태**: approved (사용자 결정 wait — Healthchecks.io 가입 + ping URL 박제)
**parent issue**: #1242 (긱뉴스 스카우트 2026-05-23 GCP 계정 중단 outage 보고서)
**cycle**: 1039 (2026-05-29)
**plan file**: `~/.develop-cycle/plans/moneyballscore/18.md`

## 1. 현 상태

application-level health 다중 layer 박제 (5개 GH Actions workflow):

| Workflow | 주기 | 목적 |
|---|---|---|
| `deploy-drift-alert.yml` | '17 * * * *' (매시간) | main HEAD vs production deploy 동기 |
| `health-alert.yml` | '27 * * * *' (매시간) | runtime health probe |
| `runtime-error-alert.yml` | event-based | Sentry runtime error |
| `vercel-deploy-error-dispatch.yml` | event-based | Vercel deploy 실패 |
| `pat-expiry-check.yml` | daily | PAT expiry 14일 전 |

**잔존 risk 카테고리**:

1. **GH Actions 자체 down** — 위 5개 모두 GH Actions 의존 → GH Actions outage 시 silent skip
2. **Cross-vendor 동시 outage** — GCP/Vercel/Supabase 동시 down (GCP 5/19 outage 류) 시 partial signal 박제 → 외부 관점 cross-check 부재
3. **사용자 가시 latency degradation** — application alive 이지만 응답 시간 outlier (~30s+ tail) 시 → 200 응답으로 Sentry runtime error 미발화

**baseline ROI evaluation**: 사례 9 family 14건 silent drift 박제 evidence — 운영 자가 fix 진화로 가시 사용자 영향 차단 누적 = 추가 layer ROI **낮음**. cross-vendor outage 1회 발생 시 데이터 누락 누적 가능 (예: predict cron silent skip → 일 1건 누락) — 이 case 만 신규 layer 정합.

## 2. 3 option 비교

| Option | Free Tier | UX | self-host migration | 추천도 |
|---|---|---|---|---|
| **Healthchecks.io** (ping-based) | 20 checks free | application 이 ping URL fetch → ping 누락 시 alert. silent fallback 정합 | ✅ self-host 가능 (Docker) | ⭐⭐⭐ |
| **UptimeRobot** (probe-based) | 50 monitors free | 외부 server 가 production URL HEAD probe 매 5분 | ❌ self-host X | ⭐⭐ |
| **자체 self-host** (Vercel Functions cron OR Cloudflare Workers free) | 무료 | 자체 cron 추가 — 외부 alternate 위치 (Cloudflare Workers free tier) 에서 production HEAD probe | ✅ vendor 자율 | ⭐⭐ (Step C carry-over) |

### option 추천 = Healthchecks.io free tier

**선택 이유**:
- ping-based UX = silent fallback 정합 (application 영향 0)
- free tier 20 checks 충분 (현 cron 10 사용)
- self-host migration path 존재 (free tier 미달 시)
- 외부 paid SaaS (Datadog/LaunchDarkly) 회피 — cost guard 정합

**선택 X 이유 (UptimeRobot)**:
- probe-based = 추가 layer (외부 server → production 응답 측정). application 영향 X 동일하지만 UX latency 측정 강점 = 본 plan scope (outage detection only) 외
- self-host X — vendor lock-in light

**선택 X 이유 (자체 self-host)**:
- 외부 관점 cross-check 의도 정합. 하지만 Cloudflare Workers free tier + GH Actions 모두 down 가능성 (~희소) 검출 부재. Healthchecks.io 외부 server 가 더 강한 layer
- Step C carry-over (cross-vendor outage detection layer = Cloudflare Workers 자율 cron) 로 분리

## 3. Step B (carry-over, 사용자 결정 후 별도 PR)

### B-1. 사용자 영역 (Healthchecks.io setup)

1. https://healthchecks.io 가입 (GitHub OAuth)
2. 3 check 생성 (모두 free tier 안):
   - `moneyball-predict-cron` — UTC 01:00 daily expected
   - `moneyball-lotto-cron` — UTC 00 금 expected
   - `moneyball-results-cron` — UTC 13:00 daily expected
3. ping URL 3건 박제:
   - `HEALTHCHECKS_PING_URL_PREDICT` — Vercel env
   - `HEALTHCHECKS_PING_URL_LOTTO` — Vercel env
   - `HEALTHCHECKS_PING_URL_RESULTS` — Vercel env
4. Telegram bot integration (Healthchecks.io 자체 — Slack/Email/Telegram 지원)

### B-2. 본 메인 자율 (코드)

```ts
// apps/moneyball/src/lib/health-ping.ts (신규)
export async function pingHealthchecksIo(slug: 'predict' | 'lotto' | 'results'): Promise<void> {
  const envKey = `HEALTHCHECKS_PING_URL_${slug.toUpperCase()}`;
  const url = process.env[envKey];
  if (!url) {
    console.warn(`[health-ping] ${envKey} 부재, ping skip`);
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
  } catch (e) {
    console.warn(`[health-ping] ${slug} fetch fail, silent fallback`, e);
  }
}
```

- predict cron fire 끝점에서 `pingHealthchecksIo('predict')` 호출 (silent fallback)
- lotto cron + results cron 동일

### B-3. smoke test

```ts
// apps/moneyball/src/lib/__tests__/health-ping.test.ts
describe('pingHealthchecksIo', () => {
  it('env 부재 시 silent skip', async () => { /* env unset → no throw */ });
  it('fetch fail 시 silent fallback', async () => { /* timeout/network error → no throw */ });
  it('정상 응답 시 ping 발화', async () => { /* 200 → ping URL 호출 */ });
});
```

## 4. Step C (carry-over, 별도 plan TBD)

Cross-vendor outage detection layer:
- Cloudflare Workers free tier (100k requests/day) 사용 — production URL HEAD probe 매 5분
- 3회 연속 실패 시 Telegram alert
- Healthchecks.io 자체 down 검출 = "Healthchecks.io 가 우리 ping 받는지" 자체 cross-check 외 layer

본 plan scope 외 (Step B fire 후 별도 plan 박제 검토). 본 doc 박제 시점 (cycle 1039) `plan #19` 가정 = 실제 plan #19 박제 (cycle 1041, Footer + 메가메뉴 + shadcn carry-over) 와 plan number 충돌 — 본 cross-vendor Step C 는 후속 별도 plan number 박제 시점에 결정.

## 5. 사용자 결정 요청

| 결정 항목 | 옵션 | 본 메인 추천 |
|---|---|---|
| Healthchecks.io 가입 | go / skip | **go** (free tier, silent fallback, plan #17 패턴 정합) |
| Step B fire 시점 | 즉시 / n=150 이후 / kill-switch fire 후 | **즉시** (lite scope, plan #17 SDK 통합 동일 시점) |
| Step C (Cloudflare Workers) | 별도 plan 박제 / skip | **별도 plan 박제** (cross-vendor layer 1회 발생 시 데이터 누락 차단 가치) |

## 6. cost 분석

| 항목 | cost |
|---|---|
| Healthchecks.io free tier | $0/month (20 checks 이내) |
| Vercel env 박제 (3 var) | $0 |
| Cloudflare Workers (Step C) | $0/month (100k req/day 이내, 매 5분 = 일 288 req) |
| **total monthly** | **$0** |

cost guard 정합 (외부 paid SaaS 회피).

## 7. self_verification rubric (5축)

| 축 | 평가 |
|---|---|
| 가치 | low~medium (application-level 다중 layer 박제됨. 추가 layer = cross-vendor outage 1건/year 가정 시 ROI 낮음) |
| 시간 비용 | small (doc-only 본 cycle. Step B fire 시 ~150 LOC + smoke test = 1 cycle) |
| risk | 1 (외부 free tier 추가 light risk. doc 박제 risk 0) |
| 자율 가능 | partial (doc 자율, SaaS 가입 사용자 영역, 코드 wire 자율) |
| 의존성 | 단일 (사용자 결정 wait — Healthchecks.io 가입 + env 박제) |

**Tier 분류** = Tier 2 (medium + 자가 검증 후 — 본 plan scope, doc-only fire OK).

## 8. carry-over

- Step B fire = 사용자 결정 후 별도 PR (lite scope, ~150 LOC + smoke test)
- Step C = 별도 plan 박제 검토 (cross-vendor outage detection layer)
- plan #18 status = approved → completed_doc_only_pending_user_healthchecks_setup (Step B fire 시점 갱신)
- 사용자 결정 wait 패턴 = plan #17 (Vercel Edge Config slot 생성 wait) 동일

## Decision Audit Trail

- 2026-05-29 (cycle 1039): scout #1242 carry-over. application-level health 다중 layer 박제 evidence + 사례 9 family 자가 fix 진화 누적 → ROI 낮음 baseline. cross-vendor outage 1건/year 가정 시 추가 layer 가치 박제.
- 본 메인 자율 fire = doc 박제 only. Step B/C 실 통합 = 사용자 결정 wait (plan #17 동일 패턴).
- 외부 paid SaaS (Datadog/LaunchDarkly) 옵션 평가 X — cost guard 정합.
