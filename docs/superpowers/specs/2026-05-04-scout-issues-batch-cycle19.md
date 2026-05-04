# scout-geeknews 봇 issue 3건 일괄 처리 — cycle 19

**날짜**: 2026-05-04
**chain**: fix-incident (lite)
**처리 범위**: #48 DO_NOT_TRACK / #30 PII 스크러빙 / #29 race condition

## 배경

cycle 18 meta-finding (`docs/superpowers/specs/2026-05-04-naver-gateway-integration-status.md`): scout-geeknews 봇이 코드베이스 grep 없이 외부 기사 가치 신호 발신 → false positive 패턴. cycle 18 에서 #47/#39 (kbo-cli Naver Sports) 이 동일 패턴으로 close. 본 cycle 은 남은 open issue 3건에 동일 검증 절차 (issue body 가설 vs 실제 grep) 적용.

## 인벤토리 결과

### #48 DO_NOT_TRACK 표준 기반 텔레메트리 제어 — **진짜 gap**

```bash
grep -r "doNotTrack\|DO_NOT_TRACK\|globalPrivacyControl" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs"
# 0 hits
```

- 클라이언트/서버 어디에도 DNT/GPC 체크 없음
- `instrumentation-client.ts:9-26` 의 Sentry init 은 `dsn` 만 가드
- DSN 환경변수가 모든 환경에서 active 면 사용자 옵트아웃 경로 X

**Fix (단일 파일, ~5줄)**:
```ts
// instrumentation-client.ts
const optedOut =
  typeof navigator !== 'undefined' &&
  (navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true);

if (dsn && !optedOut) {
  Sentry.init({ ... });
}
```

DNT 표준 = `navigator.doNotTrack === '1'` (Firefox/Safari/Edge). GPC = `navigator.globalPrivacyControl === true` (Brave/Firefox, CCPA 표준). 둘 중 하나 true 면 Sentry init 자체 skip = 텔레메트리 0.

**서버 측 보류**: instrumentation.ts 의 Node.js `DO_NOT_TRACK` env var 는 운영자 의도 (Vercel deploy 시 설정) 이지 사용자 의도 X. 서버사이드는 클라이언트 요청 헤더 없이 사용자 DNT 의향 알 수 없음. 별도 follow-up 가치 낮음 (DSN 미설정 = 자연 옵트아웃).

### #30 PII 스크러빙 및 데이터 프라이버시 정책 재검토 — **이미 박제**

```bash
grep -rn "beforeSend\|scrubSentryEvent" --include="*.ts" --include="*.tsx"
# 6 hits
```

- `instrumentation-client.ts:24` `beforeSend: scrubSentryEvent` ✅
- `instrumentation.ts:17` `beforeSend: scrubSentryEvent` ✅
- `sentry-scrub.ts:4` event payload 전체 walk → 민감 키 [Filtered] 치환 ✅
- `lib/hub-dispatch.ts:12, 79` 2차 스크럽 (defense-in-depth) ✅
- 메모리 `content-infrastructure-sentry-pii-scrubbing-beforesend.md` 박제 ✅

봇 가설 (Flo 사례 → 우리도 검토 필요) = 우리는 이미 v0.5.21 시점 (2026-04-19 가드 B 테스트) 부터 코드 레벨 + 대시보드 양쪽 + hub-dispatch 2차까지 다층 박제. 추가 작업 없음.

### #29 race condition 취약점 재검토 — **이미 박제**

```bash
grep -rn "ON CONFLICT\|first-write-wins" --include="*.ts" --include="*.sql"
# 5 hits
```

- `pipeline/schedule.ts:6` first-write-wins ON CONFLICT DO NOTHING 명시 ✅
- `pipeline/daily.ts:570` first-write-wins 다중 cron 경합 catch ✅
- `pipeline-daily.test.ts:8` R5: predictions INSERT 23505 catch race test ✅
- `pipeline-schedule.test.ts:109` first-write-wins describe block ✅
- `naver-schedule.ts:17` 점수·SP 명시적 덮어쓰기 (first-write-wins 아님 표시) ✅

봇 가설 (GLM-5 사례 → 우리도 race condition 가능성) = 본 프로젝트는 v0.5.22 (PLAN_v5 Phase 4, 2026-04-20) 시점부터 first-write-wins + concurrency lock + dedup test 박제. 추가 작업 없음.

## 결론

| Issue | 봇 가설 | 실제 grep 결과 | 결정 |
|---|---|---|---|
| #48 DNT | 텔레메트리 표준 미적용 | grep 0 hits = 진짜 gap | **fix** (instrumentation-client.ts +9 줄) |
| #30 PII | beforeSend 감사 필요 | 2026-04-19 부터 다층 박제 | **inventory close** |
| #29 race | 워커 race condition 가능 | first-write-wins 5곳 + test 2건 | **inventory close** |

3 issue 모두 `Fixes #48 #30 #29` 박제로 동시 close.

## meta-finding 강화 (cycle 18 → cycle 19)

**scout-geeknews 봇 false positive 패턴 (5 sample)**:

| Cycle | Issue | 봇 가설 | 실제 |
|---|---|---|---|
| 18 | #47 | kbo-cli Naver 게이트웨이 도입 | 5 모듈 + worker 측정 인프라 풍부 구현 (subset) |
| 18 | #39 | Naver Sports API 활용 | 동일 (#47 와 동일 주제) |
| 19 | #48 | DNT 표준 미적용 | grep 0 hits = 진짜 gap |
| 19 | #30 | PII 스크러빙 감사 필요 | 2026-04-19 부터 다층 박제 |
| 19 | #29 | race condition 가능 | 5곳 first-write-wins 박제 |

**bias 경향**: 5건 중 1건 (20%) 만 진짜 gap. 나머지 4건 = 봇이 외부 기사 키워드 (PII / race / Naver) 와 우리 메모리/CLAUDE.md 의 키워드 매칭만 보고 신호 발신. 코드베이스 실제 구현 여부 검증 X.

**cycle 18 retro 의 5순위 actionable**: scout-geeknews 봇 prompt 에 코드베이스 grep 단계 추가. 5 sample 누적된 본 cycle 에서 강화. 별도 cycle 후속 가능 (허브 측 `agent-fleet/scout-geeknews.mjs` prompt 수정).

## 변경 파일

- `apps/moneyball/src/instrumentation-client.ts` (+9 줄, -1 줄): DNT/GPC 옵트아웃 체크
- `docs/superpowers/specs/2026-05-04-scout-issues-batch-cycle19.md` (본 spec)

## 검증

- `pnpm exec tsc --noEmit` clean (apps/moneyball)
- DNT 적용 path: `navigator.doNotTrack === '1'` 또는 `navigator.globalPrivacyControl === true` 시 Sentry init 자체 skip → 클라이언트 텔레메트리 0 (트레이스/리플레이/에러 모두 skip)
- DSN 미설정 path: 기존 동일 (no-op)
- 둘 다 false 시: 기존 동일 (Sentry init + beforeSend scrub)
