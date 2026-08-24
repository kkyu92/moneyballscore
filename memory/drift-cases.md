# Drift Cases — 사례 1~14 박제 (cycle 1 ~ 869)

> CLAUDE.md 다이어트 (2026-05-27, cycle 986 시점) 로 분리 박제. 원본 = `CLAUDE.md.bak-2026-05-27`.
>
> **carry-over (cycle 870~986 gap)**: 사례 15+ + 사례 9 family 25번째 재발 박제 누락. 본 문서에 추가 필요.
>
> **외부 cross-ref**: 일부 사례는 `docs/lessons/` 에 별도 박제됨 — `2026-04-22-vercel-deploy-failure-webhook-revert-cascade.md` (사례 9 family) / `2026-05-14-anthropic-credit-silent-fallback-v18.md` (사례 11 family).

## silent drift family 메타 패턴 요약

| 사례 | layer | 첫 발견 | family 재발 |
|------|-------|---------|-------------|
| 1 | 메모리/체크포인트 stale | 2026-04-15 | — |
| 2 | 사전 작업 존재 미확인 | 2026-04-15 | — |
| 3 | feat 머지 후 silent 죽음 (3건) | 2026-04-15 | — |
| 4 | retro.ts homeCode 반쪽 작동 | 2026-04-15 | — |
| 5 | KBO API 필드 mismatch | 2026-04-16 | — |
| 6 | Sentry observability silent (5건) | 2026-04-19 | — |
| 7 | 필드 매핑 fix 가 구조적 버그 노출 | 2026-04-17~19 | — |
| 8 | KBO `/ws/Main.asmx` Referer 봇 차단 | 2026-05-20 (cycle 769) | — |
| **9** | **vercel auto-deploy alias silent skip** | 2026-05-20 (cycle 772) | **9회+** (cycle 794/840/842/843/850/868/878/882/883...) |
| 10 | Turbopack route segment re-export build fail | 2026-05-21 (cycle 794) | — |
| 11 | predict_final window_too_late silent silent drop | 2026-05-20 (cycle 813) | — |
| 12 | ORM column mismatch → Turbopack build fail | 2026-05-21 (cycle 849) | 사례 14 잔존 |
| 13 | pnpm overrides transitive ESM/CJS break | 2026-05-22 (cycle 866) | — |
| 14 | Supabase column 부재 → REST 500 silent | 2026-05-22 (cycle 869) | 사례 12 family 잔존 |

---

### 드리프트 사례 1 — 구현된 코드를 그린필드로 간주 (2026-04-15 오전)

메모리에 "Phase 2 완료, Phase 3 예정"만 있었는데, git log에 **Phase C (에이전트 토론 통합) + Phase D (Compound 루프) 이미 구현**되어 있었음. 5시간 "그린필드" 플래닝 후 마지막에 787줄 기존 코드 발견 → 플랜 전면 재조정 필요. 같은 사고 반복 금지.

### 드리프트 사례 2 — 반복된 패턴 (2026-04-15 v4-2 착수 시)

Phase v4-2 Task #5 "Vitest 설치"를 계획했는데 **이미** 설치되어 있었음 (루트 `vitest ^4.1.4`, `packages/kbo-data/vitest.config.ts`, 기존 테스트 2개). 또 한 번 "신규 작업"으로 가정하고 접근하다가 실제 작업 직전 발견.

교훈: **어떤 신규 파일·패키지·설정도 실제로 만들기 직전에 `ls`/`find`로 존재 여부 확인**. 체크포인트/플랜은 이를 보장하지 않음.

### 드리프트 사례 3 — 사전 버그 3건이 "작동 중 기능"처럼 보임 (2026-04-15 v4-2 프로덕션 검증)

Phase C/D는 main에 머지된 상태였지만 **실제로는 3개 사전 버그로 완전히 죽어 있던 상태**였음:
1. **CI pnpm 버전 충돌**: `pnpm/action-setup` `version: 9` vs `packageManager: pnpm@10.33.0` → 모든 daily-pipeline cron 실패
2. **`predictions.model_version VARCHAR(10)` overflow**: `'v2.0-debate'` (11자) 저장 시도 → ERROR 22001 → `daily.ts` upsert에 `.error` 체크가 없어서 silently 무시 → ANTHROPIC_API_KEY 있는 환경에서 새 prediction row 0건 생성
3. **Sonnet 모델 ID 오타**: `'claude-sonnet-4-6-20250514'` (`20250514`는 구 Sonnet 4.0 날짜) → 404 → Sonnet 심판 영구 실패 → blog reasoning이 fallback 한 줄 ("에이전트 토론 불가. 정량 모델 v1.5 결과 사용.")만 저장

세 버그 모두 git log의 debug 커밋 3건 (`25d9107 debug: 환경변수 확인용 임시 로그`, `f60ccd1 debug: 에이전트 토론 에러를 errors 배열에 노출`, `df282ba debug: 토론 결과 디버그 로그 추가`)이 추적하려다 원인을 못 찾고 멈춘 것들.

**교훈**: `git log`에 `feat:` 커밋이 있고 main에 머지됐다고 해서 **실제로 동작한다는 뜻이 아님**. "통합됐다"와 "돌아간다"는 다름. 프로덕션 검증 없는 feat 커밋은 잠재적으로 죽어 있는 코드일 수 있음. v4-2 작업이 이 3건 전부 드러내고 수정함.

### 드리프트 사례 4 — v4-2 머지 이후 retro.ts `homeCode` 하드코딩 숨은 버그 (2026-04-15 v4-3 eng-review)

v4-3 플래닝 중 `/plan-eng-review`가 발견. `retro.ts:121`이 `team_code: homeCode`만 insert하고 `awayCode`를 완전히 무시 → **Phase D Compound 루프가 실질적으로 50% 반쪽만 작동**한 상태. Phase C/D가 머지된 2026-04-14 이후 away 팀 agent_memory는 단 한 건도 생성된 적 없음.

이 버그는 debug 커밋 3건(사례 3)과 **다른 종류**: 사례 3은 "코드가 아예 안 돌았음", 이 버그는 "코드가 반만 돌고 있었음". git log `feat:` 커밋이 있어도 eng-review의 코드 독해가 있어야 발견 가능.

**교훈**: plan-eng-review의 "read through the code" 단계가 체크포인트·메모리·드리프트 스캔으로 안 잡히는 세 번째 종류의 버그(silent 반쪽 작동)를 잡을 수 있음. 머지 전 필수.

### 드리프트 사례 5 — KBO API 필드 불일치로 live-update 완전 사망 (2026-04-16 자연 발화 관찰)

`kbo-live.ts`가 `GAME_SC_HEADER_NM`, `G_ST`, `HOME_SCORE` 등 **실제 API에 존재하지 않는 필드**를 참조. `statusText`가 항상 빈 문자열 → 모든 경기 `status: 'scheduled'` → `liveGames: 0`. v4-3 구현 이후 live-update가 **단 한 번도 경기를 감지한 적 없었음**. 실제 필드는 `GAME_STATE_SC`("2"=진행), `B_SCORE_CN`(홈점수), `GAME_INN_NO`(이닝) 등.

**교훈**: 외부 API 연동 코드는 구현 시점에 **실제 API 응답과 대조** 필수. 테스트에서 mock만 사용하면 필드 불일치를 절대 못 잡음. curl로 실제 호출해보는 게 가장 확실.

### 드리프트 사례 6 — 관측 인프라 silent 실패 (2026-04-19)

Sentry P3 (worker→hub 자동 dispatch) 배선 중 가드 B (PII 스크러빙 검증) 테스트가 **5건 silent 버그 동시 폭로**: 서버 사이드 Sentry 완전 사망 / 대시보드 Sensitive Fields 깊이 매칭 안 됨 / 서버리스 flush 누락 / 이슈 그룹핑으로 새 이벤트 묻힘 / sourcemap 업로드 미배선. CI·빌드·클라이언트 기능 전부 통과했는데 서버 observability 만 조용히 죽어 있던 상태.

참조:
- `memory/content-harness-engineering-guard-test-pattern.md` (메타 패턴 — 의도적 검증 테스트가 N건 동시 폭로)
- `memory/content-context-engineering-nextjs-instrumentation-location.md` (Next.js 16 src/app 에서 instrumentation.ts 위치)
- `memory/content-infrastructure-sentry-pii-scrubbing-beforesend.md` (beforeSend 훅 vs 대시보드)
- `memory/content-infrastructure-sentry-serverless-flush.md` (Vercel 서버리스 captureException flush)

**교훈**: 마이그레이션 커밋이 CI 통과 + 클라이언트 기능 정상 + 빌드 무에러여도 서버 observability 가 silent 죽음 가능. **관측 인프라 배선은 항상 "설정 + 의도적 테스트 이벤트 수신 확인" 짝**. 설정만 해두고 넘어가면 silent 실패 감지 불가.

### 드리프트 사례 7 — 필드 매핑 수정이 숨어 있던 구조적 버그를 드러냄 (2026-04-17~19)

2026-04-16 커밋 2046796 이 `kbo-official` scraper 의 KBO API 필드 매핑 수정 (잘못된 필드 → 정상 필드). 기능적으로는 버그 fix 였으나 **두 개의 숨은 구조 버그를 동시에 노출**:
1. 파이프라인 타이밍: 15 KST predict cron 1회 실행이 주말 낮경기 14:00 (이미 live) 를 스킵 → predictions 미생성
2. UI fragility: 홈/analysis/feed 의 `predictions!inner` 가 predictions 없는 games 를 화면에서 완전 제외

4/17-19 사흘 연속 홈페이지 5경기 편성에도 2-3경기만 노출. 2046796 이전엔 `parseGameStatus` 가 없는 필드만 읽어 **항상 scheduled 리턴** → 우연히 낮경기도 predict 통과 → 버그가 은폐됨.

**교훈**: 기능적 버그 fix 가 구조적 버그의 커버를 제거할 수 있음. 단일 소스 fix 후 관측 가능한 메트릭 (홈페이지 경기 수, pipeline_runs gap) 확인 필수. 사용자 육안 감지 없었으면 운영 데이터 오염이 v2.0 튜닝까지 이어질 뻔함.

해결 (PLAN_v5, 2026-04-20 ship): 이중 방어선 — UI 리질리언스 (LEFT JOIN + PlaceholderCard) + 파이프라인 재설계 (매시간 cron + 경기별 3h 윈도우 + first-write-wins).

### 드리프트 사례 8 — KBO `/ws/Main.asmx` Referer 봇 차단 (2026-05-20, cycle 769)

5/20 0~04 UTC daily-pipeline cron 5건 모두 `status=error`. `fetchGames` + `fetchLiveGames` 가 호출하는 `/ws/Main.asmx/GetKboGameList` 가 정상 JSON 대신 KBO 메인 HTML (IE conditional comment) 리턴 → `JSON.parse` 실패 → `"KBO API parse error"` throw. 봇 차단 정책 변화로 추정.

curl 진단:
- Referer 없이 POST → HTML
- `Referer: https://www.koreabaseball.com/Schedule/Schedule.aspx` + POST → 정상 JSON
- `User-Agent` 단독 (MoneyBall) → HTML
- 다른 endpoint (`/Record/TeamRank/*.aspx`) 는 `KBO_USER_AGENT` 단독으로 정상 작동

→ Referer 헤더가 결정적 검증. 차단은 `/ws/Main.asmx` POST endpoint 한정.

최소 scope fix (PR #1101):
- `types.ts:KBO_SCHEDULE_REFERER` 상수 박제
- `kbo-official.ts:fetchGames` + `kbo-live.ts:fetchLiveGames` headers 에 Referer 추가
- `scrapers-kbo-official.test.ts` regression guard 1건

**교훈**: 외부 site 봇 차단 정책은 사전 통지 X — 어느 날 갑자기 endpoint 응답 형식 변경. cron silent error 시 endpoint 별 curl 진단 필수 (UA + Referer + Origin 조합). source-of-truth 단일 상수로 박제하여 향후 다른 endpoint 발생 시 한 줄 추가로 fix.

### 드리프트 사례 9 — Vercel CLI 가 .gitignore 무시 → main push 자동 production deploy silent skip (2026-05-20, cycle 772)

cycle 763~772 (10 PR) 모두 main push 후 production deploy 자동 트리거 X. PR vercel check = `Canceled by Ignored Build Step` (preview ignoreCommand 정상). 단 `vercel ls --prod` 마지막 Ready = cycle 762 retro (a2a73e6) 2h 전. cycle 763 이후 10 retro commit + 9 ship PR 모두 production 미반영 (사용자 가시 X — main push CI green 만 봐선 발견 불가능). cycle 772 IndexNow ping 첫 fire 진단 중 부수 발견.

진단:
- vercel CLI 가 root `.gitignore` 따르지 않음 → `vercel --prod` 강제 시 1.2GB 업로드 시도 → `File size limit exceeded (100 MB)`
- `node_modules` / `.next` / `.turbo` / `dist` 명시 제외 `.vercelignore` 박제로 해소
- 박제 후 `vercel --prod --yes` 정상 deploy (`dpl_35pqXz8sox5WXaYJKDCeUxkQEZYh`)

최소 scope fix (PR #1104):
- `.vercelignore` 박제 — vercel CLI silent `.gitignore` skip 차단
- 모든 cycle 763~772 ship 본 deploy 로 일괄 production 반영 확인

root cause 미확정 (24h carry-over): vercel.com dashboard production branch 설정 / webhook / git connection 점검 필요 (사용자 영역, dashboard 접근 본 메인 X). 임시 해소 = `.vercelignore` + 수동 `vercel --prod` 정착.

**교훈**: CI green + PR merge 만으론 production 반영 단정 X. 운영 인프라 (deploy/webhook) 도 silent drift family — vercel deploy 자동 트리거 ↔ git push 사이 단절 가능. 매 cycle N 시점 `vercel ls --prod` 또는 production URL 의 최신 ship 검증 1회 권장. R5 메타 패턴 silent drift family evidence (사례 3/4/6/7/8 운영 코드 silent — 사례 9 = 운영 인프라 silent 확장).

### 드리프트 사례 10 — twitter-image.tsx `runtime` re-export → Turbopack build fail → production 30 commit silent (2026-05-21, cycle 794 carry-over)

cycle 779 PR #1111 (root OG/Twitter image 박제) 의 `apps/moneyball/src/app/twitter-image.tsx`:

```tsx
export { default, runtime, size, contentType, alt } from "./opengraph-image";
```

Next.js 16 Turbopack 가 route segment config (`runtime`) re-export 를 statically 파싱 불가:

```
Next.js can't recognize the exported `runtime` field in route. It mustn't be reexported.
```

→ cycle 779 머지 (2026-05-20 ~07h) 이후 **30 commit production deploy fail**. main HEAD = 5ace15a (cycle 794) vs production aliased = 3d2e960 (cycle 778 spec). PR #1109/#1112~#1159 30건 production 미반영. 가장 critical = PR #1158 우천취소 silent drift family fix 가 production 미반영 (5/20 사례 사용자 가시 X 자체).

진단:
- `vercel ls --prod | head -8` → 직전 3 deploy 모두 `● Error` (Turbopack build fail)
- `vercel inspect <deploy> --logs | grep "Build error"` → re-export 라인 정확 노출
- 직전 cycle 772 `.vercelignore` 박제 (PR #1104) 는 vercel CLI 파일 크기 제한 회피 fix — **별개 문제**

최소 scope fix (PR #1160):
- `twitter-image.tsx` 의 `default` 만 re-export, `runtime` / `size` / `contentType` / `alt` 명시 박제 (statically parsable). opengraph-image.tsx pattern 그대로 매칭.
- local `pnpm build` 통과 → `/twitter-image` static prerender 정상
- PR #1160 머지 후 production 자동 deploy 0667fa6 Ready (4분), alias swap 완료 → 30 commit 일괄 catch-up

사례 9 carry-over 잘못된 가설 (vercel.com dashboard webhook 점검) 정정: vercel webhook 작동 정상 — 매 push 마다 build trigger fire, Turbopack build fail 로 alias swap 만 skip. silent drift 사례 9 임시 해소 (`.vercelignore`) 가 진짜 root cause 와 무관했음.

**사례 9 family 재발 (2026-05-21, cycle 840)**: cycle 838 PR #1195 머지 (829ed03) + cycle 839 d44e820 push 양쪽 production auto-deploy 채널 silent skip. cycle 840 fix-incident heavy 진단 시점 `/api/version` HTTP 404 + `vercel ls --prod` = 1h 전 (cycle 837 시점 production alias 잔존) + preview 4개 Canceled (ignoreCommand 정상) + local `pnpm build` PASS (Turbopack build fail X = 사례 10 family 아님). 수동 `vercel --prod --yes` 1회 fire → `dpl_3Ps73WkkxmdQB5B1xxyE47xAxMZq` Ready (2m) → alias swap → `/api/version` HTTP 200 + `commit_sha=d44e820` 검증 통과. cycle 794 시점 가설 "vercel webhook 작동 정상" 재정정 — main push auto-deploy 채널 자체가 간헐 silent skip 가능 (build fail 부재 + .vercelignore 박제 후에도). root cause 미확정 (vercel.com dashboard webhook 점검 = 사용자 영역). 임시 해소 패턴 정착 — 매 cycle N 시점 `/api/version` HTTP + commit_sha 양쪽 확인 + 필요 시 수동 `vercel --prod` 1회 fire. silent drift family alert 채널 (cycle 838 PR #1195 deploy-drift-alert workflow) 가 본 family 재발 자동 감지 — cycle 840 수동 `gh workflow run deploy-drift-alert.yml` dispatch (run 26222762877) 11s success + `::notice::drift 0` (alias swap 직후 측정이라 gap=0) = alert channel 실측 통과 evidence.

**사례 9 family 재재발 (2026-05-21, cycle 842, gap=2 cycle)**: cycle 840 수동 fix (dpl_3Ps73WkkxmdQB5B1xxyE47xAxMZq, alias swap 시점 prod_sha=d44e820) → cycle 840/841 retro + cycle 839 sync PR #1196 머지 + cycle 841 retro 3 commit (104f115/d971bd0/bb1b037) main push → cycle 842 진단 시점 production /api/version 응답 = 여전히 d44e820 (= cycle 839 시점 박힌 prod sha) + main HEAD = bb1b037 (cycle 841 commit) + `vercel ls --prod` 가장 최근 deploy = dv55crrux (14m 전, = cycle 840 수동 fix 시점 deploy 이후 새 build 0건) = **사례 9 family 14분 후 재발 입증**. cycle 840 fix 직후 cycle 841 retro main push 시점부터 auto-deploy 채널 silent skip 계속. cycle 842 수동 `vercel --prod --yes` 2nd 시도 → `dpl_E6rZ8fRYteBmfffdutLnPPFCBet2` (URL py4nlnct3) Ready (1m) → alias swap → `/api/version` commit_sha=bb1b037 = main HEAD 정합 + gap=0 검증. **재재발 패턴 박제** — root cause 미확정 상태에서 매 cycle main push 시 silent skip 반복 (cycle 840 fix → cycle 842 fix → cycle 843+ push 시 재발 가능성 높음). 임시 해소 패턴 정착 (cycle 840 시점 박제 vs cycle 842 재재발 evidence): 매 cycle N retro 박제 push 직후 `/api/version` commit_sha vs main HEAD 비교 1회 의무 + mismatch 시 즉시 수동 `vercel --prod --yes` 1회 fire. silent drift family alert 채널 (cycle 838 PR #1195 deploy-drift-alert.yml `'17 * * * *'` 매시간 cron) 가 자동 감지 path — 본 시점 다음 자동 fire = 12:17 UTC (= 21:17 KST) = gap=0 (cycle 842 fix 직후 측정이라) 또는 mismatch 발견 시 `::error::` 출력. 자율 webhook root cause 진단 본 메인 가능 범위 외 (vercel.com dashboard 접근 X, vercel CLI `vercel git connect/disconnect` 외 webhook 상세 진단 명령 X).

**사례 9 family 재재재발 (2026-05-21, cycle 843, gap=1 cycle + 임시 해소 패턴 자체 한도 도달)**: cycle 842 수동 fix (dpl_E6rZ8fRYteBmfffdutLnPPFCBet2, alias swap 시점 prod_sha=bb1b037) → cycle 842 retro 1 commit (6bc7b49) main push → cycle 843 진단 시점 production /api/version 응답 = 여전히 bb1b037 (= cycle 841 시점 박힌 prod sha) + main HEAD = 6bc7b49 (cycle 842 commit) + gap=1 commit silent skip = **사례 9 family gap=1 (3 cycle 연속) 재재재발 입증** (cycle 838 첫 발견 11 cycle gap → cycle 840 재발 2 cycle gap → cycle 842 재재발 2 cycle gap → cycle 843 재재재발 1 cycle gap, 가속 패턴). 본 cycle 843 수동 `vercel --prod --yes` 3rd 시도 → **`api-deployments-free-per-day` 100/day 한도 초과 error** ("Resource is limited - try again in 24 hours") = **임시 해소 패턴 (수동 vercel --prod fire) 자체 운영 한도 도달**. 24h 안 100+ deploy 누적 (preview ignoreCommand cancel 다수 + cycle 840/842 production fire 2건 + 본 cycle 시도 1건 = vercel 카운트 산정 기준 한도 초과). **임시 해소 패턴 fail 입증** — 매 cycle 수동 fire 운영이 본질적으로 sustainable X. cycle 843 fallback = (1) 24h 후 자연 reset 대기 (passive 정착) (2) deploy-drift-alert 자동 cron 21:17 KST 자연 fire (수동 dispatch X) 결과 박제 evidence + (3) carry-over 사용자 영역 root cause 점검 (vercel.com dashboard webhook + git connection) 영구 강조. **본 메인 진단 가능 범위 소진 입증** — silent drift family 사례 9 만은 본 메인 가능 범위 내 fix path 부재 (사례 8/10/11 = 운영 코드 fix path 명확, 사례 9 = vercel.com dashboard 사용자 영역). 사용자 영역 carry-over 채널 본 cycle 843 retro 박제 = 본 메인 자율 영역 closed. 다음 자율 진단 = silent drift family 본 메인 가능 범위 외 인정 + 다른 chain 우선 (explore-idea plan #3 또는 review-code silent drift family 외 영역 sweep).

**사례 9 family 5번째 재발 (2026-05-21, cycle 850, gap=7 cycle, fix-incident heavy gap=1 carry-over)**: cycle 849 PR #1205 fix (c2ec1cb, 사례 12 신규 발견 = ORM column 부재 fix) 머지 직후 production /api/version 응답 = cycle 842 시점 박힌 prod_sha bb1b037 + main HEAD = 624c582 (cycle 849 commit) + gap=7 commit silent skip = **사례 9 family 5번째 재발 입증**. cycle 843 박제 "본 메인 가능 범위 외 인정" 패턴 정정 — vercel 100/day deploy 한도 24h 자연 reset 후 (cycle 843 → cycle 850 = 7 cycle gap 안 한도 회복) 수동 `vercel --prod --yes` 다시 가능. dpl_B5MxZUXGowEwV4Fs46rCDvNbmfuw Ready (2m) → alias swap → /api/version commit_sha=624c582 gap=0 + /insights/[date] 라우트 3건 (2026-05-20/21/22) 모두 HTTP 200 검증 통과. deploy-drift-alert 자동 dispatch (run 26226856192) 14s success = alert channel **5번째 작동 evidence** (cycle 838 박제 인프라 5번 실측 통과). 가속 패턴 정정 — cycle 838→840→842→843 = gap 11→2→2→1 가속 → cycle 843→850 = gap 7 (cycle 844~849 6 cycle 동안 main push 없는 lite chain 또는 fix-incident gap 자연 흡수 = 가속 패턴 break). **사례 9 family 본 메인 가능 범위 정정**: vercel 100/day 한도 reset (24h 주기) 후 수동 fire 가능 = 본 메인 자율 fix path 존재 (단 24h 안 fire 한도 도달 시 carry-over). 사용자 영역 root cause (vercel.com dashboard webhook + git connection) 점검은 여전히 carry-over 유지 = 영구 fix X, 매 cycle main push 시 silent skip 잠재 반복 패턴 유효.

**사례 9 family 6번째 재발 (2026-05-22, cycle 868, gap=18 cycle / gap=16 commits — 가장 큰 누적 gap)**: cycle 850 fix (dpl_B5MxZUXGowEwV4Fs46rCDvNbmfuw, alias swap 시점 prod_sha=624c582) → cycle 851~867 17 cycle 운영 (skill-evolution 1 + explore-idea 5 + review-code 4 + fix-incident 3 + lotto 1 + op-analysis 1 + info-arch 1 + explore-idea partial 1) 누적 main push 8 PR (PR #1216 cycle 859 fix-incident + PR #1218~#1223 cycle 862~867) → cycle 868 fix-incident lite 진단 시점 production /api/version 응답 = cycle 859 시점 박힌 prod_sha 4a6c459 + main HEAD = a86cb94 (cycle 867 retro) + gap=16 commits silent skip = **사례 9 family 6번째 재발 입증 + 가장 큰 누적 gap 기록**. `vercel ls --prod` 직전 9 deploy 모두 ● Ready 1m duration (Error 0건) — build trigger fire 정상 + alias swap 만 silent skip = cycle 850 가설 ("vercel webhook build trigger 정상 작동 / alias swap 채널 silent skip") 6번째 정합. 본 cycle 868 수동 `vercel --prod --yes` 시도 → **`api-deployments-free-per-day` 100/day 한도 초과 error** ("Resource is limited - try again in 24 hours") 재발 = cycle 843 시점과 동일 quota 한도 도달 패턴. cycle 850 박제 가설 "24h reset 후 수동 fire 가능 = 본 메인 자율 fix path 존재" **재정정 필요** — 18 cycle gap 동안 quota 자연 reset 가정 fail 입증 (cycle 859 fix-incident PR #1216 머지 + cycle 866 PR #1222 머지 등 preview ignoreCommand cancel 다수 누적 + 다른 vercel CLI 호출 = 24h quota window 안 새 deploy 누적으로 다시 한도 도달). **본 메인 가능 범위 재재정정 (cycle 868 박제)**: vercel 100/day quota window 가 본 메인 자율 fix path 의 본질적 가변성 — cycle 843 (한도 도달 carry-over) → cycle 850 (자연 reset 후 fire 가능) → cycle 868 (재한도 도달 carry-over). **사용자 영역 영구 fix (vercel.com dashboard webhook + git connection 점검) 가 유일한 안정 path 재확정**. silent drift family alert 채널 실측 evidence — 수동 dispatch run 26264067215 11s success, body status=200, main_short=a86cb94 prod_short=4a6c459, gap_hours=0 → `::notice::recent push detected — gap 0h < 1h (deploy in progress). 다음 시간 재검사.` = alert channel **6번째 작동 evidence** (cycle 838 박제 인프라 6번 실측 통과). 다음 자동 cron `'17 * * * *'` 자연 fire = 03:17 UTC (= 12:17 KST) 시점 gap_hours≥1 도달 시 `::error::` 첫 fire 예상 (cycle 867 retro commit a86cb94 시각 ~01:50 UTC 기준 90+ 분 경과). 가속 패턴 갱신 — cycle 838→840→842→843→850→868 = gap 11→2→2→1→7→18 (자연 흡수 패턴 더욱 강화 — 다른 silent layer fix 누적 사례 12 cycle 849 ORM column + 사례 13 cycle 866 ESLint runtime 으로 silent drift family streak 더 stable). carry-over (1) 24h 후 자연 reset 대기 + (2) deploy-drift-alert 자동 cron 자연 fire 03:17 UTC 시점 결과 박제 + (3) **사용자 영역 root cause 점검 영구 강조 (vercel.com dashboard webhook + git connection 점검)**.

**사례 9 family 7번째 재발 (2026-05-22, cycle 878, gap=10 cycle / gap=6 commits — cycle 868 fix 시도 후 잔존 silent skip)**: cycle 868 시점 carry-over quota 한도 도달 → 다음 자동 cron `'17 * * * *'` fire 또는 24h 자연 reset 대기 → cycle 869~877 9 cycle 운영 누적 main push (PR #1225 cycle 869 fix-incident 사례 14 fix + PR #1226 cycle 870 review-code sweep 45 + PR #1227 cycle 871 fix-incident runtime-error-alert + PR #1228 cycle 872 plan #5 spec + PR #1229 cycle 873 plan #5 Step 2~3 + PR #1230 cycle 874 plan #5 Step 4 + PR #1231 cycle 875 plan #5 Step 5~6 closure + PR #1232 cycle 876 review-code sweep 46 + PR #1233 cycle 877 review-code sweep 47). 단 cycle 871 commit ee92dc3 (runtime-error-alert workflow) 가 production alias swap 1회 성공 — vercel ls --prod 14건 모두 ● Ready 1m duration (Error 0건). 그러나 cycle 872~877 6 commits (PR #1228/#1229/#1230/#1231/#1232/#1233 + 3 retro commit) auto-deploy 채널 silent skip = cycle 878 fix-incident lite 진단 시점 production /api/version 응답 = cycle 871 시점 박힌 prod_sha ee92dc3 + main HEAD = c643062 (cycle 877 retro) + gap=6 commits silent skip = **사례 9 family 7번째 재발 입증**. 본 cycle 878 수동 `vercel --prod --yes` 시도 → **`api-deployments-free-per-day` 100/day 한도 초과 error** ("Resource is limited - try again in 24 hours") 재재발 = cycle 843 + cycle 868 시점과 동일 quota 한도 도달 패턴 3번째. cycle 868 박제 "vercel 100/day quota window 본 메인 자율 fix path 본질적 가변성" 패턴 3번째 정합. **사용자 영역 영구 fix (vercel.com dashboard webhook + git connection 점검) 가 유일한 안정 path 7번째 재확정**. silent drift family alert 채널 실측 evidence — 수동 dispatch run 26266675551 ~5s success, body status=200, main_short=c643062 prod_short=ee92dc3, gap_hours=0 → `::notice::recent push detected — gap 0h < 1h (deploy in progress). 다음 시간 재검사.` = alert channel **7번째 작동 evidence** (cycle 838 박제 인프라 7번 실측 통과). 가속 패턴 갱신 — cycle 838→840→842→843→850→868→878 = gap 11→2→2→1→7→18→10 (cycle 868 18 cycle gap 후 cycle 878 10 cycle gap = 가속 X / 자연 흡수 패턴 유지). cycle 871 PR #1227 머지 직후 alias swap 1회 성공 evidence = auto-deploy 채널 가 완전 죽은 게 아니라 간헐 silent skip 패턴 정합 (cycle 850 가설 7번째 정합). carry-over (1) 24h 후 자연 reset 대기 + (2) deploy-drift-alert 자동 cron 자연 fire 결과 박제 + (3) **사용자 영역 root cause 점검 영구 강조 (vercel.com dashboard webhook + git connection 점검) — 7번째 박제**.

**사례 9 family 8번째 + 9번째 재발 + prebuilt deploy path 신규 박제 (2026-05-22~23, cycle 882~883)**: cycle 884 작업 본문 evidence carry-over. cycle 882 가 사례 9 family 8번째 재발 (며칠 누적 fail family 재발 운영 코드 silent layer 와 동시 진단) + cycle 883 가 9번째 재발 (며칠 누적 Telegram 알림 fix 직후 production silent skip). **prebuilt deploy path 신규 박제 (cycle 883)** = `vercel build --prod --yes` (local build, `.vercel/output` 생성) + `vercel deploy --prebuilt --prod --yes` 2 단계 fire. quota 우회 = build quota 차감 X (local 빌드라 vercel-side build credit 미사용), deploy quota only 차감. cycle 884 안 본 path 3회 fire (6b646a3, b14d586, 1073d2c) 모두 정상 alias swap + /api/version commit_sha sync. **신규 자율 fix path 박제** — vercel 100/day deploy quota 한도 도달 시 (cycle 843, 868, 878 carry-over 패턴) 본 path 가 fallback (단 deploy quota 자체 한도 도달 시 동일 fail, 그러나 build credit 절약 = window 더 길게 유지). 사례 9 family 영구 fix 는 여전히 사용자 영역 (vercel.com dashboard webhook + git connection 점검). cycle 885 deploy drift 측정 = production /api/version commit_sha = b1da036 = main HEAD = gap=0 (자율 fix 직후 정상). cycle 886 측정 = production /api/version commit_sha = b6e51a1 = main HEAD = gap=0 (sweep 51 PR #1248 후 정상). **alert channel cycle 838~886 사이 누적 9번째 실측 통과 evidence** (cycle 840 첫 fire + cycle 842/843/850/868/878 5번째 + cycle 882/883 8번째 + cycle 884 9번째). 가속 패턴 갱신 — cycle 838→840→842→843→850→868→878→882→883 = gap 11→2→2→1→7→18→10→4→1.

**교훈**: build fail 도 deploy silent drift 의 동급 위험. CI green + PR merge 만 아니라 `vercel ls --prod` Ready 상태 + alias swap 양쪽 검증 필수. `vercel inspect <deploy> --logs` build error 진단이 root cause 정확도 100%. 매 cycle N 시점 production alias commit 과 main HEAD 대조 1회 권장. R5 메타 패턴 silent drift family evidence — 사례 3/4/6/7/8 운영 코드 silent + 사례 9 운영 인프라 (deploy quota + auto-deploy 채널 간헐 silent skip) silent + 사례 10 = **빌드 시스템 silent** 확장. 운영 alert 박제 완료 (cycle 838 PR #1195): `apps/moneyball/src/app/api/version/route.ts` neue endpoint (VERCEL_GIT_COMMIT_SHA + commit_ref + deploy_env + region + timestamp 노출, no-store cache) + `.github/workflows/deploy-drift-alert.yml` 매시간 cron `'17 * * * *'` — main HEAD vs production /api/version commit 비교. mismatch + ≥ 1 hour gap 시 `::error::` (사례 9/10 silent drift family 재발 의심 진단 권장 메시지 포함). endpoint 부재 / deploy fail (HTTP ≠ 200) 시 즉시 `::error::` (사례 10 Turbopack build fail family). silent drift family alert coverage 확장 — 사례 8 (cycle 826 KBO scraper) + 사례 11 (cycle 819 predict_final) 운영 코드 silent + **사례 9/10 deploy 인프라/빌드 시스템 silent 통합 alert**. **첫 fire 실측 통과 (cycle 840, 2026-05-21)**: 수동 `gh workflow run deploy-drift-alert.yml` dispatch (run 26222762877) 11s success + body status=200, main_sha=prod_sha=d44e820, `::notice::drift 0`. alert channel 본 사용자 가시 evidence 통과 = cycle 838 박제 인프라 작동 검증.

### 드리프트 사례 11 — predict_final window_too_late silent silent drop (2026-05-20, cycle 813)

2026-05-20 SKvWO 1경기 predictions 영구 누락. daily-pipeline cron 4 mode (announce/predict/predict_final/verify) 의 마지막 기회 path 인 `predict_final` (UTC 13:00 = KST 22:00) 시점엔 18:30 KST 경기 이미 3.5h 진행 → `shouldPredictGame` 가 `hoursUntil < 0` 검사로 `window_too_late` reject → `windowTargets` 진입 못함 → `predict_final` 의 fallback row 박제 path 자체 진입 못함 = **silent silent drop**.

원인 chain:
- predict mode (UTC 07/08/09 = KST 16/17/18) 3회 모두 debate fallback fail (Claude API 529 + validator hallucinated 응답)
- cycle 779 fix (predict mode 3회 fallback continue 의도) = predict mode 다음 cron 재시도 잠금 회피 + 의도된 동작 유지
- predict_final 시점엔 18:30 경기 이미 시작 → window_too_late reject → fallback row 박제 path 부재
- 결과 = predictions=0 + games_found>0 silent 누락 (사용자 가시 X, cron pipeline_runs.status=success)

최소 scope fix (PR #1173):
- `packages/kbo-data/src/pipeline/schedule.ts:shouldPredictGame` 에 `allowLateWindow = false` param 추가 (default 후방호환)
- `hoursUntil < 0 && !allowLateWindow` 조건 변경 — 다른 reject 경로 (not_scheduled / sp_unconfirmed / already_predicted / window_too_early) 정상 작동 유지
- `packages/kbo-data/src/pipeline/daily.ts` 의 windowTargets 계산 시 `mode==='predict_final'` 일 때만 `allowLateWindow=true` 전달
- 7 unit test regression guard 추가 (allowLateWindow 비활성 시 reject + true 시 통과 + 다른 reject 경로 영향 0)

cycle 779 fix 와 호환: predict mode 다음 cron 재시도 잠금 회피 유지 + predict_final 마지막 기회 추가 보장. status='live' 또는 'final' 진입 시 `not_scheduled` 별도 reject 유지.

**교훈**: cron mode 별 fallback path 의 마지막 기회 누락이 silent silent drop 으로 이어짐. predict mode 3회 fail 운영 가시 시그널 없으면 predict_final 시점 발견 0건. silent drift family 11번째 — 사례 3/4/6/7/8 운영 코드 silent + 사례 9 인프라 silent + 사례 10 빌드 시스템 silent + **사례 11 = cron mode-specific fallback path silent**. 운영 alert 박제 완료 (cycle 819 PR #1179): `packages/kbo-data/src/pipeline/silent-drift-alert.ts` 신규 헬퍼 (`shouldAlertSilentDrift` pure + `captureSilentDriftAlert` 동적 sentry import) + `daily.ts` finish() wire — predict_final cron predictions=0 + games_found>0 즉시 Sentry warning 발사 (`predict_final_silent_drift` 메시지 + `pattern: silent_drift_family_case11` 태그). 다음 silent silent drop 발생 시 사용자 가시 metric loss 차단. **실측 fire evidence (cycle 861, 2026-05-22 op-analysis lite 측정)**: pipeline_runs 직전 7일 (2026-05-15~22) 106 runs 중 사례 11 silent_drop (predict_final + games_found>0 + predictions=0) 6건 = silent-drift-alert.ts 6회 실측 fire. 운영 alert channel 작동 검증 = cycle 819 박제 인프라 6번 실측 통과 evidence + 사례 11 family 재발 monitoring 채널 활성. **false positive 정정 (cycle 864 PR #1220, 2026-05-22)**: cycle 864 op-analysis heavy (v1.8 cohort split 측정) 부수 발견 — 직전 7일 predict_final cron 7회 중 6회 (86%) 가 false positive. root cause = `shouldAlertSilentDrift` 가 `predictionsGenerated===0` 만 검사하고 `existingSet` (predict mode 아침에 박제한 row) 미고려 → predict mode 가 모든 games cover 한 정상 동작도 alert 발사. fix = `SilentDriftAlertMeta.existingPredictionsCount?: number` field 추가 + `coverage = predictionsGenerated + (existingPredictionsCount ?? 0)`, `coverage < gamesFound` 시 alert. `daily.ts` mutable holder `existingPredictionsCountHolder.value = existingSet.size` 박제 시점 동기 → finish() closure 가 transit 전달. 13 unit test (5 신규: existing=games 미발화 / partial existing 보완 / partial without existing alert / fallback / mixed cover + 2 정정: "predictionsGenerated>0=OK" 단순 룰 → "coverage=full" 엄밀화 + 6 기존). silent drift family alert coverage 정정 첫 사례 — cycle 819 PR #1179 인프라 박제 후 첫 실측 정정. 사례 11 의도 (predict_final 마지막 기회 후 cover 안 된 games 즉시 감지) 유지 + false positive 차단. 다음 predict_final cron (KST 22:00 = UTC 13:00) 시점 = 모든 games existingSet cover 시 alert 미발화 검증 carry-over.

### 드리프트 사례 12 — ORM select 컬럼 부재 → Turbopack build fail → `/insights/[date]` route 빌드 시스템 silent (2026-05-21, cycle 849)

cycle 847 PR #1203 `/insights/[date]` daily archive route 박제 시 `apps/moneyball/src/lib/insights/loader.ts` 가 supabase `predictions!inner(games)` select 안 `games.home_team_code` + `games.away_team_code` 컬럼 참조. 실제 `games` 테이블 컬럼명 = `home_team` + `away_team` (KBO team_code 직접 컬럼) = 컬럼명 mismatch.

```
Failed to compile.
./src/lib/insights/loader.ts
Type error: Property 'home_team_code' does not exist on type ...
```

→ Turbopack build fail → cycle 847 PR #1203 머지 (2026-05-21) 이후 production deploy 자동 trigger 시도 silent skip (build fail). 사례 10 family (twitter-image runtime re-export) 패턴 정합 — **빌드 시스템 silent layer** 두 번째 evidence (re-export 차이: 사례 10 = route segment config statically X / 사례 12 = ORM column mismatch).

진단:
- `vercel ls --prod | head -5` → 직전 3 deploy `● Error` (Turbopack build fail)
- `vercel inspect <deploy> --logs | grep "home_team_code"` → loader.ts 정확 노출
- local `pnpm build` 가 동일 에러 재현 (CI test smoke 통과 = supabase type generation mocked 차이)

최소 scope fix (PR #1205, cycle 849 fix-incident heavy gap=6 carry-over):
- `apps/moneyball/src/lib/insights/loader.ts` 의 select clause 정정 — `home_team_code` → `home_team` (실제 컬럼명) + `away_team_code` → `away_team`
- `apps/moneyball/src/app/insights/[date]/page.tsx` 의 entry mapping alias 패턴 정합
- local `pnpm build` 통과 + production deploy = c2ec1cb (단 cycle 850 사례 9 family 5번째 재발 = 수동 vercel --prod 1회 fire 후 alias swap)

후속 family fix (PR #1213, cycle 856 explore-idea lite Step 8):
- `apps/moneyball/src/app/feed/route.ts` 안 남은 `home_team_code` / `away_team_code` query reference sync (loader.ts fix scope 외 silent layer — cycle 856 19 신규 unit test 박제 시점 동시 발견)
- 사례 12 family 의 silent layer 차단 patch 완료

**교훈**: ORM type generation 이 supabase 컬럼명 mismatch 를 build time 까지 silent (CI test 가 mocked supabase type 으로 통과). Turbopack build fail 발생 시점 = production deploy 시 vercel build = 사용자 가시 evidence 부재 (사례 10 동일 layer). silent drift family 12번째 — 사례 3/4/6/7/8 운영 코드 silent + 사례 9 인프라 silent + 사례 10/12 **빌드 시스템 silent 2건** + 사례 11 cron fallback silent. 운영 alert 자동 감지 path 박제 완료 (cycle 838 PR #1195 deploy-drift-alert.yml) — build fail → /api/version HTTP ≠ 200 → `::error::` 즉시 exit 1 (사례 10 Turbopack build fail family 와 동일 trigger path 자연 흡수). cycle 849 fix 직후 사례 9 family 5번째 재발 evidence = cycle 850 carry-over (사례 9 본문 line 224 박제). 사례 12 family 잔존 instance = 사례 14 (cycle 869 PR #1225 predictions/page.tsx 동일 column 패턴, 본문 사례 14 entry 박제). silent drift family streak ~334 cycle (cycle 458 → cycle 869) 유지 — 본 메인 자율 영역 silent layer 12/14 fix path 박제 + 사례 9 만 사용자 영역 root cause 미확정 carry-over.

### 드리프트 사례 13 — pnpm overrides 전역 swap → minimatch@3 transitive 의존 brace-expansion@5 ESM-only require fail → ESLint runtime 빌드 시스템 silent (2026-05-22, cycle 866)

cycle 859 PR #1216 `npm audit` 4건 0건 fix 시 `pnpm.overrides` 에 `"brace-expansion": ">=5.0.6"` 전역 박제. 본 override 가 minimatch@3.1.5 transitive 의존 (`eslint-config-next > eslint-plugin-import > @typescript-eslint/parser > @typescript-eslint/typescript-estree`) 의 `brace-expansion: "^1.1.7"` resolution 도 5.0.6 으로 강제 swap. brace-expansion@5.x = ESM-only (`"type": "module"`) → minimatch@3.1.5 CommonJS `require('brace-expansion')` 시 `expand=undefined` → `TypeError: expand is not a function` ESLint config-array `doMatch` 호출 시 throw.

```
TypeError: expand is not a function
    at Minimatch.parse (.../minimatch@3.1.5/dist/cjs/index.js:...)
    at doMatch (eslint config-array)
```

→ `pnpm lint` EXIT 2 → CI green 채널 깨짐 → cycle 859→866 **16 consecutive CI failures**. 운영 코드 변경 0 / 패키지 의존성 자체 silent layer = 사례 10 (Turbopack route segment config statically X) + 사례 12 (ORM column mismatch) 와 동일 **빌드 시스템 silent layer 3번째 evidence**.

진단 (cycle 866):
- `/health` baseline 측정 중 `pnpm lint` exit 2 노출 — review-code (heavy) chain 가 fix-incident chain 자연 redirect (review-code-discovered)
- cycle 859 머지 (4a6c459a, 2026-05-22T00:36:31Z) 직후 첫 CI fail, 직전 cycle 858 머지 cc3b4f22 = green
- R7 자동 머지가 main push 후 CI 결과 무시 가능성 (PR auto-merge required check 미설정) — 후속 진단 carry-over

최소 scope fix (PR #1222):
- `pnpm.overrides` path-scoped + version-pinned 박제:
  - `minimatch@3>brace-expansion: ^1.1.14` — minimatch@3 transitive 만 1.x patched (CVE-2026-45149 fix in 1.1.12+)
  - `brace-expansion@<1.1.12: >=1.1.14` — 미패치 1.x 강제 upgrade (defense in depth)
  - `brace-expansion@2|3|4|5: >=2.0.2|>=3.0.2|>=4.0.1|>=5.0.6` — 각 메이저 patched 버전 (cycle 859 의도 유지)
- `pnpm install` (+6 -3 packages) + `pnpm lint` 3/3 tasks → CI green 복귀 + `pnpm audit` 0 advisory + `pnpm test` 537 PASS regression 0

**교훈**: pnpm.overrides 전역 single-version pin = transitive 의존이 다른 메이저 버전 요구하는 경우 ESM/CJS 호환성 silent break. fix path = path-scoped override (`A>B: version` 형식) + 모든 메이저 version constraint 명시. CI green 채널 16 cycle silent = R7 auto-merge 의 required check 미설정 가능성 carry-over (사용자 영역 점검). silent drift family 13번째 — 빌드 시스템 silent layer 사례 10 (Turbopack runtime re-export) + 사례 12 (ORM column) + **사례 13 = ESLint runtime CommonJS/ESM transitive** 3번째 evidence. cycle 859 PR #1216 test plan 안 `pnpm lint` 검증 step 누락 = R5 메타 패턴 (test 만 보고 lint 안 봄) 재발. fix 후 lint pre-merge step 강제 carry-over.

### 드리프트 사례 14 — Supabase select 컬럼 부재 (`games.home_team_code` / `games.away_team_code`) → REST 42703 → `/predictions` 페이지 silent 500 운영 코드 silent (2026-05-22, cycle 869)

cycle 670 PR #959 `/predictions` 검색박스 박제 시 `apps/moneyball/src/app/predictions/page.tsx:64` data select 에 `home_team_code` + `away_team_code` 직접 컬럼 박제 (검색 attr `data-prediction-teams` 박제 source 의도). 실제 `games` 테이블 컬럼명 = `home_team` + `away_team` (KBO team_code 직접 컬럼) = 사례 12 와 동일 column mismatch.

```
Supabase REST: "code": "42703", "message": "column games.home_team_code does not exist"
→ assertSelectOk(error) throw → Next.js error boundary 렌더 → /predictions HTTP 500
```

→ cycle 670 머지 (2026-05-19) 이후 production **~199 cycle 잔존 silent 500**. 사례 12 family 잔존 instance — cycle 849 PR #1205 loader.ts sweep + cycle 856 PR #1213 feed/route.ts sweep 시점 모두 predictions/page.tsx 미포함. **사례 12 family 잔존 detection channel = review-code (heavy) sweep + supabase REST 수동 fire 진단**. 사례 12 = Turbopack build fail (사용자 가시 evidence X) vs 사례 14 = REST runtime 500 (사용자 가시 — production HTML `error="" parallel router param` 노출).

진단 (cycle 869 fix-incident heavy):
- production HTML fetch → error boundary 렌더 evidence 확인
- supabase REST 수동 fire (service role anon) → `42703 column does not exist` 정확 노출
- 직전 sweep (cycle 849 + cycle 856) 시점 grep scope = loader.ts + feed/route.ts only, predictions/page.tsx 누락
- review-code sweep 44 (cycle 866→867→868 next_rec carry-over) 가 자연 source 매핑 → fix-incident redirect

최소 scope fix (PR #1225):
- `apps/moneyball/src/app/predictions/page.tsx` select clause 정정 — `home_team_code` + `away_team_code` → `home_team:teams!games_home_team_id_fkey(code)` + `away_team:teams!games_away_team_id_fkey(code)` FK 조인 패턴 (insights/page.tsx cycle 844 정합)
- 신규 regression guard 1 test (`predictions-page.test.ts`) — `home_team_code` / `away_team_code` 0 match grep
- `pnpm test` 538 → 539 + `pnpm build` `/predictions` static prerender 통과 + `pnpm lint` + `tsc --noEmit` 0 error

후속 family sweep 박제 (cycle 870 review-code sweep 45):
- `apps/moneyball/src` + `packages` 전수 grep — 운영 코드 `home_team_code` / `away_team_code` 잔존 instance 0건 확인 (regression guard test 3 파일 = insights/loader/predictions 만 reference)
- 사례 12/14 family silent layer 차단 patch 완료 — 이후 발생 시 grep guard 즉시 차단

**교훈**: 같은 silent column 패턴 (사례 12 + 사례 14) 이 2 cycle 간격으로 재발 → fix scope 가 단일 instance 만 cover 시 family 잔존 가능. sweep chain 의 grep 범위 = full repo + test 분리 보장 필수. supabase REST 수동 fire = column mismatch 진단의 fastest path (CI test mock 회피, vercel build log 회피). silent drift family 14번째 — 사례 12 family 잔존 instance + 운영 코드 silent (사례 3/4/6/7/8 동일 layer, REST runtime 500 형식 신규). 사례 9 family quota carry-over 로 본 fix production silent skip 가능성 carry-over (cycle 868 박제 quota 100/day 한도 도달). silent drift family alert 채널 (cycle 838 deploy-drift-alert.yml) = build/deploy layer cover, runtime 500 layer 별도 detection channel 부재 carry-over (Sentry capture 활용 가능 — cycle 870 carry-over).



---

### 드리프트 사례 15 — agent 토론 fail rate 73% (LLM 환각 + 529 + quantOnly fallback 3 layer) (2026-05-26, cycle 986)

**진단**: 직전 14d pre_game predictions 44건 분석 결과 fullDebate 12 (27.3%) / agentsFailed 17 (38.6%) / quantOnly 15 (34.1%) = **fail rate 72.7%**.

**3 layer root cause**:

1. **L1 invented_player_name false positive (2건, 11.8%)** = 야구 도메인 합성어 (안타들 5/24 + 최근폼 5/26) 가 validator 의 한국 성씨 prefix `[가-힣]{3}` + verb context regex 안 false-positive — 단일 cycle 982 fix (PR #1322 한국어 조사 결합 명사 차단) 가 미포함 (cycle 982 fix 가 5/26 20:43 KST 머지 = 5/26 cron fire 직후, prod alias swap silent skip 으로 stale 추가).

2. **L2 SERVER_ERROR 529 Overloaded (5건, 29.4%)** = 2026-05-19 Anthropic 외부 capacity 한계 5게임 동시 fail. cycle 461 5x multiplier 박제 (17.5s window) 도 부족 evidence.

3. **L3 hallucinated_number:hard 진짜 환각 (10건, 5건 cycle 884 fix 이전 stale + 5건 fix 이후 정상 hard reject)** = LLM 가 학습 데이터로부터 raw FIP/K9/WHIP/ERA 환각 생성. raw response 1:1 분석 결과:
   - id 1338 "삼성 불펜 FIP 4.38" = factor `bullpen_fip=0.4971` normalized 만 주입 → LLM raw 환산 환각
   - id 1527 "류현진 FIP 2.90" = SP raw 다른 값 학습 데이터 추가
   - id 1534 "비슬리 K/9 10.65" = K/9 주입 후 다른 값 환각
   - id 1340 "WHIP 7.49" = WHIP 자체 미주입 환각
   - id 1337 "6개: 105, 3.6, 4.71, 4.68, 6.8, 1.5" = 다중 stat 동시 환각

**fix path 4 ship (cycle 986 fix-incident heavy)**:

- **L1 PR #1323** (29f698a) — `validator.ts COMMON_KOREAN_NOUNS` +34 entry (야구 plural 16 + 감각·상태 합성어 13 + 운영·전략 합성어 5). 안타들 / 홈런들 / 삼진들 / 볼넷들 / 타격감 / 컨택감 / 작전상 / 전술상 family 차단. test +5 (validator 89/89 PASS).
- **L2 PR #1324** (51571c6) — `OVERLOADED_BACKOFF_MS = [2500, 5000, 10000, 20000]` 신규 array (37.5s window) + `MAX_OVERLOADED_ATTEMPTS = 4` (3→4 attempts 단독 확장). 일반 5xx / 429 / 네트워크 에러 = 3 attempts 유지 (overcompensate 회피). test +6 (llm 37/37 PASS).
- **L3 PR #1325** (debe6fb) — `personas.ts BASE_PROMPT` 안 "환각 자주 발생 카테고리" 5종 (SP raw FIP/xFIP/K9 만 주입, ERA/WHIP/WAR/WIN-LOSS/IP/PitchCount 미주입 명시 + 팀 raw 평균 wOBA/불펜FIP/WAR/SFR/Elo/최근폼 만 주입 + 상대 매치업 stat 미주입 + 십진수 변환 금지 + 시즌 누적 stat 미주입) + 14d 환각 evidence 5건 prompt 안 박제 (LLM reference 가능) + 정성 표현 example 확장 (K9 / WHIP / ERA 정성) + RESPONSE_FORMAT 안 "수치 인용 최종 규칙" (반올림/절삭/산술/단위 변환 금지). test +13 (personas 13/13 PASS).
- **Monitor PR #1326** (8ed6d23) — `apps/moneyball/src/app/debug/agent-fallback/page.tsx` + `apps/moneyball/src/lib/debug/agentFallbackStats.ts` 신규 박제. fullDebate / agentsFailed / quantOnly 일자별 분포 + agentError 6 카테고리 분류 (hallucinated_number / invented_player_name / banned_phrase / server_error_529 / other_api_error / other) + 직전 12 sample. BASIC auth 보호 `/debug/*` matcher 정합. test +13 (agentFallbackStats 13/13 PASS).

**총 test +24 / tsc + lint 0 error / build /debug/agent-fallback 정상 prerender**.

**carry-over**:
- LLM nondeterminism 본질 한계 — fullDebate 100% 영구 보장 X (cron 통계 분포 평가)
- Sonnet swap A/B harness = 비용 사용자 결정 영역 (Haiku 4.5 → Sonnet 4.6 = 3~5x 비용)
- Anthropic Tool use structured output = 큰 refactor (JSON schema 강제 envoy)
- L3 predict mode silent fallback (cycle 779 의도 동작, silent-drift-alert cycle 819 박제 작동) = 미fix 유지
- 추정 fullDebate rate ~27% → ~55%+ 회복 (5/27 KBO 화 첫 evidence + N≥30 신뢰 표본 6/2 누적 후 비교)

**교훈**: agent 토론 fail = 3 layer 공존 (validator strict reject + 외부 API 장애 + LLM 학습 데이터 환각). 본 fix scope = 본 메인 자율 영역 maximally ship + LLM 본질 한계 (nondeterminism) 인정 + 통계 분포 기준 평가. raw response 1:1 분석 = root cause 파기의 fastest path (DB select + injection text vs output text 차이 비교).

---

### 사례 9 family 확장 — cycle 870~986 25번째 재발 누적 박제 (carry-over)

**cycle 870~986 117 cycle gap 안 추가 재발 박제**:

- **cycle 982** (5/26 ~21:00 KST) — main 0aa79e2 vs prod 3177a1c gap=1 commit (사례 9 family 22번째 재발)
- **cycle 984** (5/26 ~22:00 KST) — main b022619 vs prod gap=2 commits (23번째 재발)
- **cycle 985** (5/26 ~22:30 KST) — main 5a0690a vs prod b022619 gap=1 commit + quota 11번째 한도 도달 → 자연 회복 evidence
- **cycle 986** (5/26~5/27 1차) — PR #1324/#1325 머지 후 main debe6fb vs prod 29f698a gap=2 commits (24번째 재발) → 빈 commit 157404b push 후 자연 회복 ✓
- **cycle 986** (2차) — PR #1326 머지 후 main 8ed6d23 vs prod 157404b gap=1 commit (25번째 재발) → 빈 commit 2d8fdd8 push (pending)
- **cycle 986** retro 갱신 commit cd372f1 push 후 main cd372f1 vs prod 157404b gap=3 commits (silent skip 계속)

**vercel quota 12번째 한도 도달 (cycle 986)** = `api-deployments-free-per-day` 100/day. 24h reset = 5/27 22:50 KST 이후. 본 메인 자율 fix path (vercel CLI `--prod` 또는 prebuilt) 본 시점 소진.

**alert channel 25, 26번째 작동 evidence**:
- run 26449385821 (cycle 986 fix-incident heavy 진행 중 dispatch) — `::notice::drift 0` (alias 회복 직후 측정)
- run 26449937926 (alias 회복 검증 dispatch) — `::notice::drift 0` (157404b 양쪽 정합)

**자연 회복 패턴 evidence 누적** (cycle 985 박제 패턴 정합):
- 빈 commit push → git webhook → vercel build trigger fire → alias swap 자연 회복 = ~1/2~1/3 비율 (cycle 986 = 1/2 시도 성공)
- 단 quota 한도 도달 시점 자율 fix path 부재 → 24h 자연 reset 대기 carry-over

**fix path 사용자 영역 영구**:
- vercel.com dashboard webhook + git connection 점검 (25번 재발 누적 evidence 후 우선순위 ↑)
- 본 메인 자율 진단 가능 범위 외 (CLAUDE.md 박제)

---

### silent drift family 메타 패턴 누적 (cycle 1050 시점 갱신)

총 16 사례 + family 재발 누적:

| family | total | layer | 최근 재발 |
|--------|-------|-------|----------|
| 사례 9 (vercel auto-deploy alias) | 25회+ | 운영 인프라 | cycle 986 (5/26~27) |
| 사례 12+14 (Supabase column mismatch) | 2회 | 운영 코드 + 빌드 시스템 | cycle 869 |
| 사례 10+13 (Turbopack/ESM transitive build fail) | 2회 | 빌드 시스템 | cycle 866 |
| 사례 11 (predict_final silent silent drop) | 1회 + monitoring | cron mode fallback | cycle 819 alert 박제 |
| 사례 15 (agent 토론 fail rate L1+L2+L3) | 1회 | LLM nondeterminism + 외부 API | cycle 986 |
| **사례 16 (plan frontmatter status field stale)** | 3회 (plan #17 + #18 + #23) | develop-cycle retro layer | cycle 1248 |

**streak**: ~723 cycle (cycle 525~1248 silent drift family detection + fix patterns 유지)

---

### 사례 16 — plan frontmatter status field stale (cycle 1050 신규)

`~/.develop-cycle/plans/$SLUG/{N}.md` plan body Step (예: "Step A doc 박제") ship 완료 후 frontmatter `status:` field 자동 갱신 누락 = silent retro drift. SKILL.md unprocessed plan lookup 이 `status: approved` 기준 매칭 → 이미 ship 된 plan 이 반복 매칭 가능성 (silent re-process risk).

**evidence (cycle 1050 발견 시점)**:
- **plan #17** (cycle 1032 ship → PR #1407 `docs(decisions): plan #17 feature flag PoC scope 1-pager`) → status `approved` 18 cycle gap stale → cycle 1050 갱신 `doc_only_shipped_cycle_1032_pending_user_step_a`
- **plan #18** (cycle 1039 ship → PR #1415 `docs(decisions): plan #18 외부 인프라 장애 방어 1-pager`) → status `approved` 11 cycle gap stale → cycle 1050 갱신 `doc_only_shipped_cycle_1039_pending_user_step_b`

**재발 evidence (cycle 1248)**:
- **plan #23** (LLM 분석 에이전트용 executable context layer) — Step 1~4 모두 ship 완료 (cycle 1225 PR #2010 / cycle 1226 PR #2011 / cycle 1227 PR #2012 / cycle 1228 PR #2013 / cycle 1235 PR #2021 / cycle 1239 PR #2024) + wave 41~54 silent drift cleanup 14 회 ship (cycle 1230~1246) → frontmatter `status: approved` 24 cycle gap stale (cycle 1224 plan 박제 → cycle 1248 발견) → cycle 1248 갱신 `completed_steps_1_4_shipped_through_cycle_1239_plus_waves_41_54_through_cycle_1246`. 발견 trigger = 본 cycle 진단 단계 unprocessed plan lookup 시 status=approved 자연 매칭 → 이미 풀-수렴 plan 재처리 risk 인지.

**대조 evidence (정상 status 갱신 케이스)**:
- plan #11 → `completed_autonomy_pending_user_step_4_5`
- plan #12 → `completed_autonomy_pending_user_step_3_5`
- plan #13 → `tier_1_shipped_pending_user_step_4_5`
- plan #15 → `completed_all_phases_shipped_cycle_1036`
- plan #16 → `completed_first_fire_pending_n150_or_evidence_cycle_1036`
- plan #19 → `all_steps_shipped_cycle_1042_1043_1044_1046`

**fix path**: develop-cycle retro 단계에서 `cycle_state.execution.plan_n_processed=[N]` 박제 시 `~/.develop-cycle/plans/$SLUG/{N}.md` frontmatter `status:` field 자동 갱신 절차 SKILL.md 박제 (skill-evolution chain carry-over). plans/ = repo 밖 → git commit X = 본 메인 자체 retro 단계 의무 박제 layer.

**관련 family**:
- 사례 9 (vercel auto-deploy alias) — 운영 인프라 silent
- plan #N stale ref drift (cycle 1047+1048 13 occurrence, auto-memory `silent-drift-family-plan-number-stale-ref.md`) — plan body 미래 plan number 가정 stale
- 사례 16 = plan frontmatter status field stale — develop-cycle retro layer 자체 silent

---

### 사례 17 — pnpm-lock.yaml turbo specifier mismatch → CI 23-cycle + Vercel production 24h 이중 silent (cycle 1996 신규)

cycle 1971 "build: devDependencies 패치 버전 갱신" (turbo `^2.10.4`→`^2.10.5`) 커밋이 `pnpm-lock.yaml` 의 `importers.'.'.devDependencies.turbo.specifier` 를 `^2.10.5` 로 남겼으나, `pnpm.overrides.turbo` (`>=2.9.14`) 존재 시 pnpm 이 override 를 authoritative specifier 로 재계산 — `pnpm install --frozen-lockfile` 검증 시 `ERR_PNPM_OUTDATED_LOCKFILE` 불일치 발생.

**이중 blast radius**:
- **GH Actions CI**: cycle 1971 08:33:46 ~ cycle 1994 까지 main CI **100% red 23 cycle 연속**. develop-cycle 이 CI 상태 확인 없이 direct commit + policy retro 로만 진행해 완전히 미발견.
- **Vercel production 빌드**: 동일 `pnpm install --frozen-lockfile` 스텝을 Vercel 빌드도 사용 → 2026-07-22 08시경부터 프로덕션 배포 시도 **13회 이상 전부 Error**, production alias 는 cycle 1971 커밋 (`0b4d4b6`) 에 24시간+ 고정 (신규 기능/수정 사용자 가시 반영 완전 중단).

**발견 경로**: cycle 1995 review-code(heavy) 진단 중 CI 확인하여 `4042151a fix(ci)` 로 lockfile 재동기화 (CI red 23-cycle 원인 규명 + 수정). 그러나 이 fix 커밋도 review-code 로 chain_selected 된 채 넘어가 retro 요약에 반영 안 됨 — **동일 fix 가 production 24h drift 도 함께 해소한다는 사실은 cycle 1996 fix-incident 재진단 (`deploy-drift-alert` 스케줄 workflow 2026-07-21 23:09 ~ 2026-07-23 06:38 사이 대부분 `failure`, `vercel ls --prod` 13+ Error deploy) 에서야 확인.**

**핵심 gap — develop-cycle 진단 source 맹점**: fix-incident chain 의 진단 source 목록 (`pipeline_runs` 7일 gap / GH issue / Sentry / 사용자 신고 / debug commit)에 **GH Actions workflow 실행 상태 (`gh run list`) 나 Vercel 배포 상태 (`vercel ls --prod`) 자체가 없음**. `pipeline_runs` DB 는 크론 예측 파이프라인만 반영 — CI/CD 빌드 파이프라인 실패는 별도 신호계열이라 24 cycle (cycle 1972~1995) 동안 완전 blind. `deploy-drift-alert` GH Actions workflow 는 정확히 이 gap 을 메우기 위해 cycle 838 에 박제됐으나, **workflow failure 자체가 GH 이메일 알림에만 의존 — develop-cycle 자동 진단 루틴이 능동적으로 `gh run list` 를 확인하지 않는 한 32시간 연속 failure 도 자체적으로는 포착 못함.**

**fix (cycle 1996 적용)**: SKILL.md fix-incident 진단 source 표에 `gh run list --limit 10` (scheduled workflow 최근 실패 확인) 항목 추가 — pipeline_runs 만으로는 CI/CD 계열 incident 커버 불가.

**검증 (cycle 1996)**: `pnpm install --frozen-lockfile` 로컬 재실행 → `Lockfile is up to date` (재발 없음 확인). `curl /api/version` → `fa49970` = main HEAD 일치 (production 24h drift 완전 회복, 최신 배포 `Ready`).

**관련 family**:
- 사례 9 (vercel auto-deploy alias) — 운영 인프라 silent, 유사하지만 원인은 alias swap 실패 (본 사례는 build 단계 자체 실패로 원인 상이)
- 사례 10+13 (Turbopack/ESM build fail) — 빌드 시스템 계열, 본 사례와 동일 layer (CI/CD 파이프라인 자체가 진단 source 표에 없다는 구조적 맹점 공유)

---

### 사례 18 — retro "머지 진행" 완료형 서술 vs 실제 미실행 → PR 5일 open 방치 (cycle 2001 신규)

cycle 2000 이 R7 자동 머지 (`gh pr merge --auto`) 실패를 감지 (repo GraphQL `enablePullRequestAutoMerge` 비활성) → lesson 커밋 (`23c9639f`) 으로 원인 박제 + retro summary 에 "CI green 확인 후 --squash 로 수동 머지 진행" 이라고 **과거형 완료 서술**로 기록. 그러나 실제로는 `gh pr merge` 명령이 그 세션 안에서 실행되지 않은 채 signal 박제 → 세션 종료. PR #2856 은 CI green (2026-07-23 08:30 완료) 상태로 **5일간 (2026-07-23~07-28) open 방치** — 그 사이 watch loop 도 유휴 (laptop sleep 추정, watch.log 08:20:57 → 05:22:20 5일 gap).

**발견 경로**: cycle 2001 진단 단계에서 cycle 2000 json 의 `execution.results.pr` 필드가 "수동 --squash merge 진행" 이라 적혀있길래 `gh pr view 2856 --json state,mergedAt` 로 실측 대조 → `state: OPEN`, `mergedAt: null` 불일치 확인. CLAUDE.md R5 "체크포인트 주장을 현실과 대조" 원칙 그대로 적중한 사례.

**핵심 gap**: retro 서술에서 "~할 예정" (의도) 과 "~했다" (완료) 를 혼동 — 완료형으로 적었지만 그 자리에서 명령을 실제 실행하지 않음. develop-cycle 자체 실행 layer 의 self-referential silent drift (사례 15 "retro 박제 layer silent" 와 유사하지만, 본 사례는 retro 는 박제됐으나 **그 안의 서술 내용이 현실과 불일치**하는 새 변종).

**fix (cycle 2001)**: `gh pr merge 2856 --squash --delete-branch` 즉시 실행 → merged 확인. SKILL.md "commit + PR" 섹션에 mitigation 추가 — retro 에 머지 완료형 서술 적기 전 `gh pr view <#> --json state,mergedAt` 로 `state=MERGED` 실측 확인 의무화.

**관련 family**:
- 사례 15 (develop-cycle 자체 retro 박제 layer silent) — 같은 자기참조 layer, 본 사례는 retro 존재하되 내용 불일치라는 점에서 상이
- 사례 17 (pnpm-lock CI+prod 이중 silent) — R7/CI 관련 develop-cycle 진단 맹점 계열

---

### 사례 19 — skill-evolution trigger 3 (milestone) silent skip → 50 cycle 자가 진화 공백 (cycle 2051 발견, retroactive cycle 2000)

cycle 2000 이 `(milestone)` 라벨로 실행됐으나 cycle_state JSON 의 diagnosis 에 trigger 5 (직전 20 cycle chain 0회 발화) 평가만 기록되고, trigger 3 (`cycle_n % 50 == 0`) 평가나 `skill-evolution-pending` marker 박제 자체가 어디에도 없음 — explore-idea(heavy) 로 곧바로 진행. 이전 milestone (1900→1901, 1950→1951 등) 은 모두 retro 에 "milestone deferred X→X+1 via marker 파일 정상 박제" 를 명시했던 것과 대조.

**blast radius**: cycle 2000~2049 (50 cycle) 동안 `chain_selected` 에 `skill-evolution` 매칭 0건 — 다음 마커는 cycle 2050 (`2050 % 50 == 0`) 이 되어서야 정상 박제됨. 그 사이 SKILL.md/MIGRATION-PATH.md 자가 진화 갱신도 50 cycle 통째로 공백.

**발견 경로**: cycle 2051 forced skill-evolution (cycle 2050 marker 소비) 진행 중 MIGRATION-PATH.md 최신 항목이 "Next: cycle 2000" 에서 멈춰 있고 그 이후 항목이 없음을 발견 → cycle 2000.json 직접 read 로 trigger 3 평가 누락 확인.

**핵심 gap**: trigger 5(0회 발화 chain) 평가가 "충족 X" 로 나오면 그 사이클 전체를 정상 진행으로 착각하기 쉬운 구조 — trigger 3 는 트리거 5 와 무관하게 항상 독립 평가돼야 하는데 실제로는 trigger 5 평가에 딸려 암묵적으로 skip 됨.

**fix (cycle 2051)**: SKILL.md skill-evolution trigger 표 3번 행에 "다른 trigger 와 독립적으로 항상 먼저 체크" 명시 추가. MIGRATION-PATH.md 에 cycle 2000(retroactive gap 기록)/cycle 2050(정상 phase 28 요약) 항목 append.

**관련 family**:
- 사례 15 (develop-cycle 자체 retro 박제 layer silent) — 같은 자기참조 layer, 본 사례는 retro/JSON 자체는 박제되나 **트리거 평가 스텝 자체가 빠졌다**는 점에서 새 변종

---

### 사례 20 — op-analysis-weekly cron `gh pr create` 라벨 부재 silent swallow → 9주 연속 PR 미생성 (cycle 2061 발견)

`op-analysis-weekly.yml` 이 매주 cohort-split 데이터를 `data/op-analysis-<date>` 브랜치에 push 한 뒤 `gh pr create --label "automated,op-analysis"` 로 PR 을 열고 `gh pr merge --auto --delete-branch` 하는 구조. 그런데 리포에 `automated`/`op-analysis` 라벨이 애초에 존재하지 않아 `gh pr create` 가 항상 실패 — `2>/dev/null || echo ""` 가 그 실패를 삼켜 `PR_URL` 이 빈 문자열이 되고, `if [ -n "$PR_URL" ]` 가 조용히 skip, 워크플로 exit code 는 0 (success). 2026-06-15~08-10 매주 cron 9회 전부 이 경로 — `data/op-analysis-*` 브랜치 9개가 push 만 되고 main 에 머지된 적 없음. cohort-split 문서가 6/15 부터 stale, GH Actions UI 는 계속 초록 체크만 표시.

**발견 경로**: cycle 2061 operational-analysis(heavy) 가 최신 cohort 데이터 (`c4c65cd0` 커밋 언급 스캔 시점 v1.8 n=259 acc 54.4%, 이전 memory 기록 n=187 acc 59.9% 대비 큰 하락) 를 로컬에서 재확인하려다 `git ls-tree HEAD` 에 해당 파일이 없음을 발견 → `git merge-base --is-ancestor` 로 해당 커밋이 main 의 ancestor 가 아님을 확인 → `git branch -a --contains` 로 orphan 브랜치 특정 → workflow yml 자체를 읽고 라벨 부재 + silent swallow 조합 원인 규명.

**핵심 gap**: CLAUDE.md 가 이미 명시한 "cron silent error 시 endpoint 별 curl 진단 필수" 원칙이 이번엔 GH Actions 자체 UI (초록 체크) 에도 안 걸리는 케이스 — 실패가 `gh pr create` 내부 한 줄에서 흡수돼 워크플로 레벨에는 아무 신호도 남지 않음. 사례 17 (`gh run list` 로 CI/CD 파이프라인 실패 확인 필수) 도 "run 자체가 실패로 뜨는" 케이스만 다뤘는데, 본 사례는 run 이 success 로 뜨는데 그 안의 핵심 action (PR 생성) 만 조용히 빠진 한 단계 더 깊은 변종.

**fix (cycle 2061)**: `gh label create automated` / `gh label create op-analysis` 로 라벨 생성 + workflow 의 `2>/dev/null || echo ""` swallow 제거 (`set -e` 하에서 실패 시 워크플로 자체가 fail 하도록) — PR #2918 로 머지, `gh pr view --json state,mergedAt` 로 `MERGED` 실측 확인 (사례 18 mitigation 그대로 적용). 동일 라벨+머지 경로로 PR #2918 자체가 성공한 것이 fix 의 실측 증거. orphan 브랜치 9개는 최신 스냅샷(2026-08-13)에 superseded 되므로 전부 `git push origin --delete` 로 정리.

**관련 family**:
- 사례 8/11 (cron silent skip — KBO 크롤러 봇 차단, predict_final window_too_late drop) — 같은 "cron 은 success 로 보이는데 핵심 동작이 빠짐" 패턴, 본 사례는 원인이 GH label 미생성이라는 점에서 신규 root cause
- 사례 17 (CI/CD 파이프라인 실패가 `pipeline_runs` DB 진단 밖) — run 자체 실패 감지 필요성을 박제했지만, 본 사례는 run 이 success 인데 내부 단계만 조용히 skip 되는 한 단계 더 깊은 맹점
- 사례 18 (retro 완료형 서술 vs 실제 미실행) — 본 사례 fix 검증 시 동일한 "실측 확인 (`gh pr view --json state,mergedAt`)" 절차 재사용
- 사례 18 (retro 완료형 서술 vs 미실행) — 같은 cycle 2000~2001 구간에서 동시 발생한 별개 self-referential drift (머지 vs marker, 서로 독립)

---

### 사례 27 — MLB_TEAMS StatsAPI/Baseball-Reference 7팀 코드 컨벤션 불일치 → park factor + 매치업/팀페이지 DB 쿼리 5개 callsite silent 버그 (cycle 2081 발견)

`mlb_schedule`/`mlb_team_stats`/`mlb_team_elo` 는 MLB StatsAPI 의 `team.abbreviation` 원본을 그대로 저장(`scrapers/statsapi-mlb.ts`)하는데, `packages/shared/src/mlb-teams.ts` 의 `MLB_TEAMS` 키는 Baseball-Reference 3-letter 표준 — 정확히 7팀에서 두 컨벤션이 다름: `TB`/`CWS`/`KC`/`SD`/`SF`/`AZ`/`WSH`(StatsAPI, DB 실측) ↔ `TBR`/`CHW`/`KCR`/`SDP`/`SFG`/`ARI`/`WSN`(Baseball-Reference, MLB_TEAMS 키). cycle 2080 이 plan #25 Phase 1 백필 중 park factor 조회(`MLB_TEAMS[g.home_team_code]?.parkPf`) 1곳만 발견해 TODOS 에 "범위 밖 flag" 로 남겼는데, cycle 2081 fix-incident(heavy) 로 실측 확대 조사한 결과 같은 root cause 가 **DB 쿼리 필터 자체**(`.or(home_team_code.eq.<canonical>,...)`) 를 깨뜨리는 훨씬 심각한 버그를 5곳에서 유발하고 있었음 — canonical 코드로 필터링하면 DB 실측(`TB` 등)과 항상 불일치해 이 7팀이 낀 모든 매치업(`/mlb/matchup/*`)·팀(`/mlb/team/*`) 페이지가 항상 "0경기"만 반환(silent empty, park factor 보다 영향 범위 큼 — 페이지 전체가 죄다 비어 보임).

**발견 경로**: cycle 2080 TODOS flag(park factor 1곳) 를 fix-incident(heavy) 로 착수 → 실측 검증 위해 `pnpm tsx` 로 직접 supabase 쿼리 실행해 `mlb_schedule` distinct 팀 코드 759 rows 전수 확인(`AZ`/`CWS`/`KC`/`SD`/`SF`/`TB`/`WSH` 7개가 `MLB_TEAMS` 키에 없음을 확인) → Explore agent 로 `MLB_TEAMS`/`MlbTeamCode` 전체 callsite 매핑 요청 → agent 가 park factor 외 `computeMlbCompositeDuel.ts`(수렴픽 duel 계산) 를 추가 발견 → 직접 코드 read 로 `convergenceRecord.ts`/`buildMlbMatchupProfile.ts`/`buildMlbTeamProfile.ts`/`buildMlbTeamFactorAverages.ts` 4개 파일에서 동일 패턴(canonical 코드로 DB `.or()` 필터링 + `===` 비교)이 반복됨을 확인.

**핵심 gap**: 두 개의 서로 다른 "3-letter 팀 코드" 컨벤션이 같은 프로젝트 안에 공존(스크래핑 원본 그대로 저장하는 DB 레이어 vs 큐레이션된 정적 참조 테이블)할 때, 타입 시스템(`MlbTeamCode`)이 둘을 구분하지 않아 컴파일러가 전혀 잡아주지 못함 — `row.home_team_code as MlbTeamCode` 캐스팅이 5곳 모두에서 "믿고 캐스팅"으로 처리돼 있었음. 기존 테스트 fixture 들도 전부 canonical 코드(`SFG`/`WSN` 등)만 사용해 실제 DB 값(`TB` 등)을 한 번도 mock 하지 않아 버그가 4개 파일의 기존 테스트 스위트 전체를 통과하면서 은닉됨.

**fix (cycle 2081)**: `packages/shared/src/mlb-teams.ts` 에 `MLB_STATSAPI_TEAM_ALIASES`(7팀 alias map, DB 실측으로 검증) + `normalizeMlbTeamCode`(DB→canonical)/`toMlbStatsApiCode`(canonical→DB) 양방향 변환 함수 추가. `mlbShortTeamName` 내부에서 정규화 경유하도록 수정(별도 callsite 변경 없이 opponent 이름 표시 오류도 같이 해소). 5개 callsite 수정 — PR #2931(`4ab223b0`) 로 머지, `gh pr view --json state,mergedAt` 로 `MERGED` 실측 확인(사례 18 mitigation). 회귀 테스트 6건은 실제 DB 값(`TB`/`SF` 등)을 mock 입력으로 사용해 정규화 없이는 fail 하는 구조로 작성 — 향후 재발 시 테스트가 즉시 잡음.

**관련 family**:
- 사례 3/22 (VARCHAR overflow / silent .error 미체크) — "에러 없이 조용히 fallback/empty 값으로 대체" 라는 동일 상위 패턴, 본 사례는 원인이 두 팀 코드 컨벤션의 타입 미분리(캐스팅 신뢰)라는 점에서 신규 root cause
- 사례 1 (그린필드 가정 차단) — 신규 기능(plan #25 Phase 1) 백필 도중 "이미 존재하는" 데이터(`mlb_schedule`)의 실제 값을 검증 안 하고 새 코드를 얹었다가 기존 데이터와의 컨벤션 불일치를 뒤늦게 발견한 변형
- 본 사례 자체가 "한 곳만 고치면 끝" 이라는 스코프 판단이 위험함을 보여주는 사례 — 최초 발견(cycle 2080) 은 1개 callsite 였지만 같은 root cause 로 5개 callsite 가 깨져 있었음. 향후 코드 컨벤션 불일치 발견 시 grep 전수 조사 필수(본 사례가 Explore agent 활용 패턴의 근거)

---

### 사례 28 — Cloudflare Worker cron dispatch 가 설정 파일과 코드 양쪽에 같은 문자열을 하드코딩 → 한쪽만 바꾸면 silent 전면 미발화 (cycle 2082 자체 발견+예방)

`cloudflare-worker/wrangler.toml` 의 cron trigger 표현식(`crons = [...]`)과 `worker.ts` 의 `scheduled` 핸들러 안 `cronExpr === '<문자열>'` 분기 조건이 **완전히 동일한 문자열을 두 파일에 각각 하드코딩**하는 구조. Cloudflare 가 매 cron fire 시 `event.cron` 으로 실제 설정된 표현식을 그대로 넘겨주기 때문에, `wrangler.toml` 의 표현식만 바꾸고 `worker.ts` 쪽 `===` 비교 문자열을 안 바꾸면 두 문자열이 영원히 안 맞아 해당 분기(및 그 안의 모든 하위 로직) 가 배포 후 조용히 전혀 실행되지 않음 — 에러도, 로그도, silent-drift alert 도 안 뜸(분기 자체에 진입을 못 하니 그 안의 alert 로직도 실행 안 됨).

**발견 경로**: cycle 2082 explore-idea(heavy) 로 plan #25 Phase 2(`mlb_elo_update` 신규 pipeline mode) 작업 중 cron 스케줄에 UTC 22 슬롯을 추가하려고 `wrangler.toml` 의 MLB pipeline cron 표현식을 `"17 18-21,10 * * *"` → `"17 18-22,10 * * *"` 로 넓혔음. 배포 전 `worker.ts` 를 다시 훑다가 `decideMlbMode()` 옆의 dispatch 분기가 `cronExpr === '17 18-21,10 * * *'` 로 **똑같은 문자열을 별도로 하드코딩**하고 있음을 발견 — 두 파일을 동기화하지 않은 채 배포됐다면 MLB pipeline 전체(신규 `mlb_elo_update` 뿐 아니라 기존 `mlb_statsapi_scrape`/`mlb_fancy_scrape`/`mlb_savant_scrape`/`mlb_predict_final` 도 포함) 가 silent 미발화됐을 뻔함 — 사례 20(`gh pr create` 라벨 부재 silent swallow) 과 유사한 "설정 변경이 코드의 암묵적 가정을 깨뜨리는" 패턴이지만, 본 사례는 GH Actions 가 아닌 Cloudflare Workers cron 레이어에서 최초 식별.

**핵심 gap**: cron 표현식이라는 "설정값"이 실질적으로는 라우팅 키(dispatch key)로 코드에 재사용되는데, 이 관계가 타입 시스템이나 단일 source-of-truth 로 강제되지 않고 순수 문자열 리터럴 완전 일치(`===`)에 의존 — `wrangler.toml`(배포 설정, 코드 리뷰 시 놓치기 쉬운 파일)과 `worker.ts`(로직 코드) 사이 어떤 정적 검증도 없어 컴파일/린트/테스트 어느 것도 두 파일의 불일치를 잡아주지 못함. 유닛 테스트가 있었어도 `event.cron` mock 값을 테스트 코드에서 임의로 지정하므로 이 특정 mismatch(설정 파일 실제 값 vs 코드 하드코딩 값의 drift)는 안 걸림 — 오직 "두 파일을 직접 눈으로 대조" 해야만 잡히는 카테고리.

**fix (cycle 2082, 배포 전 예방)**: `worker.ts` 의 `cronExpr === '17 18-21,10 * * *'` 을 `'17 18-22,10 * * *'` 로 동시 갱신 + JSDoc 주석(7번 항목) 도 동기화. 기존 회귀 가드 테스트(`silent-drift-wave-193.test.ts`, cycle 1459 박제)가 정확히 이 두 파일의 특정 문자열을 정규식으로 검증하고 있어(당시엔 다른 migration 목적) 본 cycle 의 변경과 충돌 — 가드 테스트도 새 값(`18-22`, `6회/일`)으로 갱신. **아직 실제 fire 로 검증 전** — 다음 UTC 22(KST 07) cron fire 때 `mlb_elo_update` 모드가 정상 호출되는지 실측 확인 필요(Cloudflare Worker 배포 자체가 사례 25 로 현재 blocked 상태라 배포 후에나 가능).

**예방적 후속 후보 (Tier 2, 별도 cycle)**: cron 문자열 하드코딩 이중화 자체를 제거 — 예를 들어 `worker.ts` 가 `wrangler.toml` 을 파싱해서 표현식을 읽거나, 두 파일이 공유하는 상수 모듈을 두는 방식. 근본 원인(두 파일 간 문자열 동기화 의존)을 없애지 않으면 다음 cron 슬롯 변경 시 동일 패턴 재발 가능.

**관련 family**:
- 사례 20(`gh pr create` 라벨 부재 silent swallow) — "설정(라벨/cron 표현식) 이 코드의 암묵적 가정과 안 맞으면 핵심 동작이 조용히 스킵되는데 실행 자체는 success 로 보임" 이라는 동일 상위 패턴, 본 사례는 GH Actions 워크플로가 아닌 Cloudflare Workers 레이어라는 점에서 신규 발생 지점
- 사례 27(MLB_TEAMS 컨벤션 불일치) — "두 개의 서로 다른 문자열 표현이 같은 프로젝트 안에 공존하는데 타입 시스템이 구분 안 해줌" 이라는 점에서 유사 구조, 단 사례 27 은 사후 발견(버그가 이미 배포됨) 이고 본 사례는 배포 전 자체 발견으로 예방된 케이스 — silent drift family 안에서 "사전 예방" 성공 사례로 기록할 가치 있음

---

### 사례 29 — Vercel 배포 일일 100건 quota 소진 → main push 3건이 배포 기록 자체 없이 누락 (cycle 2083 발견)

develop-cycle 이 매 cycle 마다 PR 1건 + squash merge 1건을 만드는 구조(R4/R7)라 push 빈도가 높은데, 이게 Vercel free tier 의 **일일 배포 100건 cap** 을 실제로 소진시킨 최초 사례. cycle 2082(`d3caf0e7`)/그 뒤 두 policy·lesson commit(`d757ab0d`/`b651a3cc`) 이 main 에 push 됐지만 Vercel API(`GET /v6/deployments`) 조회 결과 이 3개 commit 에 대한 배포 레코드가 **완전히 없음**(canceled 도 아니고 아예 생성 자체가 안 됨) — `curl .../api/version` 실측으로 production 이 그 이전 commit(`4ab223b0`, cycle 2081)에 멈춰 있음을 먼저 발견했고, GH Actions(`gh run list`)에는 Vercel 배포 워크플로 자체가 없어(네이티브 git 연동이라 Actions 로그에 안 남음) 원인 특정이 한 단계 더 필요했음.

**발견 경로**: cycle 2083 explore-idea(heavy) 가 plan #25 Phase 2b 작업 결과를 prod API(`/api/mlb/pipeline`)로 실측 검증하려다 `mlb_elo_update` mode 가 "invalid mode" 로 거부됨을 발견 → `/api/version` 확인으로 production 이 stale 함을 확정 → `vercel ls --prod`/`vercel inspect` 로 최신 프로덕션 배포 시각이 3개 commit 이전임을 확인 → Vercel REST API 를 CLI 토큰(`~/Library/Application Support/com.vercel.cli/auth.json`)으로 직접 조회해 해당 commit SHA 들에 대한 배포 레코드 자체가 없음을 확정 → `vercel deploy --prod` 를 직접 실행해 `"Resource is limited - try again in 24 hours (code: api-deployments-free-per-day)"` 에러로 root cause 확정 (GH 웹훅/git 연동 장애가 아니었음).

**핵심 gap**: 기존 `deploy-drift-alert.yml`(cycle 838, 매시간 git HEAD vs `/api/version` 비교)이 "gap ≥ 1시간" 을 alert 조건으로 두고 있어 발견 당시(push 후 약 15~20분 경과)엔 아직 alert 가 안 뜬 시점 — 이 mitigation 이 "배포가 언젠가는 될 것" 을 가정한 지연 감지 설계인데, quota 소진처럼 **배포가 24시간 동안 아예 안 될 수 있는 경우**엔 이 설계가 오탐/누락 없이도 "아직 안 떴을 뿐" 상태로 조용히 방치될 위험이 있음(1시간 뒤엔 결국 뜨지만, 그 사이 여러 cycle 이 "배포됐다" 는 잘못된 가정으로 계속 진행할 수 있었음). 기존 auto-memory `feedback_deploy_strategy.md` 가 "Vercel 일 100회 제한, push는 묶어서" 라고 이미 경고했었는데 develop-cycle skill 자체의 "1 cycle = 1 commit + 1 PR + 1 merge" 원칙(R4/R7)과 구조적으로 충돌해 실제 소진이 발생.

**fix (cycle 2083, 부분적)**: Elo history backfill 은 Vercel 을 거치지 않는 Supabase 직접 스크립트(`scripts/backfill-mlb-elo.ts --apply`)로 우회 완료 — 데이터 자체는 quota 와 무관하게 채워짐. `TODOS.md` 최상단에 quota 소진 사실 + 예상 reset 시각(~2026-08-14 22:07 KST) + "reset 전엔 prod 가 stale 한 게 정상" 을 명시해 다음 cycle 들의 오진(코드는 정상인데 반영 안 되는 걸 "배포 실패" 로 재진단) 방지. **완전한 구조적 fix 는 미착수** — develop-cycle 의 push 빈도 자체를 낮추는 방안(N cycle 배치)은 R4/R7 원칙과 충돌해 사용자 결정 필요 (TODOS.md Tier 2 후속 후보로 flag).

**관련 family**:
- 사례 25(Cloudflare Worker 로컬 wrangler 세션 만료로 ~2개월 미배포) — "배포 파이프라인 자체가 코드 변경과 무관하게 막혀 있어 merge 는 성공해도 실제 반영은 안 됨" 이라는 동일 상위 패턴. 사례 25 는 Cloudflare Worker(cron primary trigger), 본 사례는 Vercel(웹앱 + API route) — 서로 다른 두 배포 대상이 동시에 각자 이유로 지연 상태였던 셈(같은 날 기준 이중 정지 지점)
- 사례 18(retro 완료형 서술 vs 실제 미실행) — "머지됐다" 와 "실제 반영(배포)됐다" 를 혼동하면 안 된다는 동일 원칙의 배포 레이어 변형 — 본 사례 이후 develop-cycle retro 는 "merge 완료" 와 "prod 반영" 을 별개 사실로 구분해 서술해야 함
- CLAUDE.md 세션 시작 스캔 룰("X 가 배포됨 → git log + 실제 파일 존재 확인")의 연장 — 이번엔 "merge 됐다" 를 "배포됐다" 로 자동 치환하지 않고 `/api/version` 실측으로 직접 대조한 것이 발견의 핵심이었음

---

### 사례 30 — 사례 25 의 "고쳤다" CI 도입 자체가 node 버전 + secret 미검증으로 첫 실행부터 2연속 failure (cycle 2090 발견+부분수리)

cycle 2068(사례 25)이 "로컬 wrangler oauth 세션 만료로 worker.ts 변경 3건이 ~2개월
silent 미배포"를 발견하고 push 시 자동 `wrangler deploy` CI 를 신설했으나, **그 CI 자체가
신설 이후 실제 발화 2건(cycle 2089 Sentry alert 커밋, plan#25 mlb_elo_update 커밋) 모두
failure** — `gh run list` 로 발견. 원인은 두 단계: (1) `deploy-cloudflare-worker.yml` 이
`node-version: 20` 사용하는데 `cloudflare-worker/package.json` 의 `wrangler ^4.108.0`
이 `engines.node >=22.0.0` 요구 — "Wrangler requires at least Node.js v22.0.0" 로
즉시 exit 1. (2) node 버전을 24 로 고치고 `gh workflow run` 으로 재실행해 실측 확인한
결과, 그 다음 단계에서 `CLOUDFLARE_API_TOKEN environment variable` 자체가 리포 secret
에 없어(`gh secret list` 로 확인) 여전히 실패 — 로컬 `wrangler whoami` 도 세션 만료
그대로라 로컬 fallback 도 불가능.

**핵심 gap**: "배포 실패를 막는 fix 를 배포했다"는 사실 자체를 실제 fire 로 검증하지
않고 커밋 시점에 success 로 간주 — 사례 25 의 fix PR(#2923) 이 merge 는 됐지만 CI 가
정상 동작하는지 최소 1회 실측 확인(`gh workflow run` 수동 fire 또는 다음 자연 push
후 `gh run list` 재확인)을 안 거쳐 22 cycle(2068→2090) 동안 "고쳐졌다"는 잘못된
가정이 유지됨 — 사례 18(retro 완료형 서술 vs 실제 미실행)과 동일 상위 패턴의 CI
인프라 버전.

**fix (cycle 2090, 부분)**: node-version 20→24 (다른 job 들과 정렬, `gh workflow
run` 으로 재발화해 node 에러 해소 실측 확인 — 에러 메시지가 node 버전 문제에서
CLOUDFLARE_API_TOKEN 부재로 바뀐 것 자체가 fix 유효성의 증거). CLOUDFLARE_API_TOKEN
등록은 Cloudflare 계정 접근이 필요해 본 메인이 자율 수행 불가 — TODOS.md 최상단에
사용자 액션 3단계(토큰 발급 → `gh secret set` → 수동 재발화 검증) 명시.

**관련 family**:
- 사례 25 — 동일 배포 파이프라인, "root cause 규명" 은 됐으나 "고친 fix 자체의 검증"
  이 빠진 것이 본 사례의 신규 지점
- 사례 18 — "완료 서술 vs 실제 실행" 원칙의 CI 인프라 계층 재확인. PR/merge 뿐 아니라
  "CI 를 신설/수정했다"는 주장도 최소 1회 실 fire 로 검증해야 함이 일반화 대상
- 사례 29 — 같은 날 Vercel(웹앱 배포)과 Cloudflare Worker(cron 배포) 양쪽이 각자
  다른 이유로 막혀 있었던 것과 마찬가지로, 배포 파이프라인은 "설정했다" 가 "작동한다"
  를 보장하지 않는다는 동일 교훈이 세 번째로 반복

---

### 사례 31 — 로컬 dev 전역 dynamic route 404 = stale Turbopack `.next` 캐시, 앱 버그 아님 (cycle 2172 발견+해소)

cycle 2171(explore-idea heavy) 이 MLB parity 작업 실측 검증 중 `/mlb/team/LAD` 가
로컬 dev 에서 404, prod 는 200 인 것을 발견해 fix-incident 후보로 flag. cycle 2172
가 재현 조사한 결과 **MLB 뿐 아니라 KBO 쪽도 동일** — `/mlb/team/LAD`(valid)
`/mlb/team/NYY`(valid) `/mlb/team/ZZZ`(invalid) `/mlb/players/1` `/mlb/matchup/LAD/NYY`
`/teams/HH`(valid) `/players/1` `/matchup/HH/LG` 전부 로컬에서만 404. 유효/무효
팀코드 무관하게 전부 404 = `notFound()` 앱 로직(개별 조건 분기)이 아니라 **라우터
레벨에서 `[param]` 세그먼트 매칭 자체가 실패**하는 신호 — 응답 title 을 확인해
확정(각 라우트 전용 `not-found.tsx`가 아니라 루트 `not-found.tsx` 가 렌더됨 = 해당
라우트의 `page.tsx` 자체가 호출되지 않음).

**발견 경로**: `buildMlbTeamProfile()` 코드 리뷰로 `!profile` 분기 원인 의심 →
`meta`/`MLB_TEAMS` 확인 결과 LAD 정상 키 → dev 서버 기동 후 여러 valid/invalid
코드로 curl 재현 → KBO 쪽 동일 패턴 nested dynamic route 로 교차 검증 → "전부
동시에 404" 패턴 확인 후 코드 조사를 멈추고 `.next` 캐시 의심(`mv .next
/tmp/backup && next dev` 재시작) → 재시작 후 동일 경로 전부 200 정상 복구,
코드 변경 0.

**핵심 gap**: "prod 는 정상, dev 만 문제" 라는 단서를 "코드에 dev-only 분기가
있다" 는 가설로 잘못 좁혀 조사를 시작하기 쉬움 — 실제로는 반대로 "prod 는 build
시 정적 생성(generateStaticParams pre-render) 이 끝난 경로라 dev 런타임 캐시
문제의 영향을 안 받을 뿐" 이라 "prod 정상 = dev 캐시 무관" 추론이 성립하지
않음. 개별 라우트 1개만 404 나는 경우(앱 로직 버그, notFound() 호출 조건 확인
필요)와 **여러 무관한 라우트가 동시에** 404 나는 경우(라우터/캐시 문제, 코드
조사 전 캐시 클리어부터)를 구분하는 게 진단 순서의 핵심 분기점.

### 사례 32 — verify cron `results_sent` flag 가 0건 검증에도 영구 박제 → KBO 게임 25건 9일+ `scheduled` 고착 (cycle 2178 op-analysis lite 발견, 미해소)

op-analysis(lite) CE cohort 재측정 중 `predictions` 테이블 pre_game v1.8 검증
건수가 cycle 2146(n=311) 이후 cycle 2178 까지 32 사이클 동안 완전 동결 발견 →
원인 추적 중 KBO `games` 테이블에서 **2026-08-05~08-09 (5일, 게임 25건, id
9377-9381/9467-9471/9547-9551/9627-9631/9707-9711)** 이 오늘(2026-08-18)까지도
`status='scheduled'`, `home_score=0/away_score=0` 로 고착된 걸 확인 (전후
08-01~08-04, 08-11~ 은 정상적으로 `final` 전환).

**근본 원인 (코드 read 로 확정, 수정은 미시행)**: `packages/kbo-data/src/
pipeline/daily.ts:420-465` verify 모드가 `isNotificationSent(db, targetDate,
'results_sent')` 로 이미 실행한 날짜는 즉시 skip — **단 `getVerifyResults()`
가 0건을 반환해도 `markNotificationFlag(..., 'results_sent', ...)` 를 그대로
호출해 flag 를 세운다** (라인 462, 주석 자체가 "verifyResults.length===0 이어도
flag 는 설정 — 재실행 차단이 목적" 이라 명시). 즉 게임이 아직 KBO 사이트에서
`final` 로 안 넘어온 시각(23:00 KST)에 verify 가 한 번 돌면 그 날짜는 **영구
봉인** — 이후 게임이 실제로 끝나 스코어가 확정돼도 verify 가 다시 그 날짜를
보러 가지 않는다. `pipeline_runs` 로그도 매일 `games_found=5 predictions=0
errors=[] status=success` 를 5일 연속 반복해 겉보기엔 "정상 재시도" 처럼 보이나
실은 매번 조기 return(라인 427) 하는 no-op.

**silent-drift-alert.ts 관련**: `shouldAlertSilentDrift` 의 verify 분기
(`verifiedCount===0 && gamesFound>0` → alert)는 이 케이스에 논리적으론 맞아야
하는데, `verifiedCount.value` 초기값이 0({value:0}, daily.ts:170)이라 조기
return 경로에서도 0 이 그대로 `finish()`→alert 로 전달돼 **매일 발화했어야
함** — 그런데 5일간 아무 수정 커밋도 없음. Sentry/Telegram 실제 수신 여부는
미확인 (다음 fix-incident 가 확인 필요 — 전송 자체가 silent fail 했을 수도,
또는 발화했지만 이 세션들 사이 사용자가 안 본 걸 수도).

**carry-over (다음 fix-incident 필수 확인)**:
1. 실제로 08-05~08-09 KBO 경기가 열렸는지(우천취소/더블헤더로 순연 가능성)
   확인 — 열렸다면 결과 backfill, 취소됐다면 `games.status='postponed'` 로
   정정.
2. `results_sent` flag 를 0건 검증 시에도 영구 세우는 로직(daily.ts:462) 이
   의도된 설계인지 재검토 — 최소한 "verified=0 인 날짜는 N일 후 재시도" 유예
   로직 필요.
3. Sentry/Telegram alert 가 실제 발화했는지 로그/알림 이력 확인 — 발화 안
   했다면 `captureSilentDriftAlert` 호출 경로 자체의 silent fail 의심.

**fix (cycle 2179, PR #2963)**: carry-over 1 — WebSearch 로 확인: 2026-08-05~09
KBO 리그가 폭염으로 전 경기 임시 중단(08-06 긴급 실행위원회 결정, 08-11 재개),
해당 25경기는 실제로 열리지 않음. `games.status='postponed'` + `home_score/
away_score=null` 로 backfill, `daily_notifications.results_sent` 5일치 리셋
(스크립트로 직접 DB 반영, 코드 배포와 무관한 1회성 정정). carry-over 2 —
`daily.ts` verify 분기에 `allGamesTerminal` 가드 추가: 그날 fetchGames 로
새로 받아온 게임 전부 `final`/`postponed` 이거나 `verifyResults>0` 일 때만
`results_sent` flag 세움 (재현 재발 차단, 신규 vitest 2건 — scheduled 미종결
시 flag 미기록 / final 종결 시 flag 기록). carry-over 3 (Sentry/Telegram 실제
발화 여부)는 **미확인 상태 유지** — Sentry API 미인증 세션이라 확인 불가,
다음 세션에서 Sentry 대시보드 직접 확인 필요.

**fix (cycle 2172)**: 코드 변경 없음 — `.next` 캐시 삭제만으로 해소되는 로컬
환경 문제였음을 확정. 재발 시 진단 순서 박제: (1) 여러 무관 라우트 동시 404
확인 → (2) 응답 title 로 루트 vs 라우트별 not-found 구분 → (3) `.next` 캐시
클리어 후 재현 여부 우선 확인 → (4) 그래도 재현되면 코드 조사 진입.

**관련 family**:
- CLAUDE.md 세션 시작 스캔 룰("체크포인트 주장을 현실과 대조")의 역방향 사례 —
  여기선 "prod 정상" 이라는 실측 사실 자체가 오히려 dev 조사 방향을 잘못
  좁히는 함정이 됐음. 실측이 항상 올바른 가설로 이어지는 건 아니고, 두
  환경(dev/prod)의 구조적 차이(런타임 렌더 vs 빌드타임 정적 생성)를 먼저
  이해해야 실측을 올바르게 해석할 수 있다는 교훈

### 사례 33 — 로컬 develop-cycle 작업 디렉토리가 origin/main 대비 1-behind + 40-ahead 로 조용히 divergence, review-code 감사 대상 파일이 실제 배포본 아님 (cycle 2197 review-code heavy 발견+해소)

cycle 2196 explore-idea(heavy) 가 "MLB 팀별 상대 강약/홈원정 parity" 를
`buildMlbTeamAccuracy.ts`(`buildMlbMatchupData()`) + `TeamMatchupCards.tsx`
generalize 로 구현·PR #2964 R7 squash-merge 까지 SUCCESS 로 retro 박제했는데,
cycle 2197 review-code(heavy) 가 그 파일을 감사하려 열어보니 **로컬 워킹
디렉토리엔 해당 코드가 전혀 없었음** — `TeamMatchupCards.tsx` 는 여전히
KBO_TEAMS 하드코딩 그대로, `buildMlbTeamAccuracy.ts` 엔 `buildMlbMatchupData`
자체가 부재. `git fetch && git status` 로 확인한 실제 상태: local main 이
origin/main 대비 **1 commit behind (스쿼시된 PR #2964 자체) + 40 commit
ahead** (cycle 2182~2196 구간 fix/docs/retro raw 커밋들 — 이 구간 다른
cycle들은 `gh pr list --state merged` 로 확인 시 각각 별도 PR(#2955~#2963)
로 이미 개별 스쿼시 머지되어 origin 엔 반영돼 있었으나, **로컬 main 브랜치
자체는 매 cycle 이후 한 번도 pull/ff 되지 않아** origin 의 스쿼시 커밋과
로컬의 원본 커밋이 같은 내용을 서로 다른 해시로 중복 보유한 채 계속 벌어짐.

**핵심 gap**: review-code(heavy) chain 의 전제("메인이 직접 코드 read")가
로컬 파일이 실제 배포본과 같다는 암묵적 가정에 의존하는데, PR 브랜치+squash
워크플로 자체가 로컬 main 을 절대 되돌려 갱신하지 않아 이 가정이 깨질 수
있음. 사례 8/11 류("체크포인트가 실제와 다름")의 변형이지만, 여기선
체크포인트/메모리가 아니라 **작업 디렉토리 파일 자체**가 stale 소스였다는
점에서 한 단계 더 근본적 — git log(커밋 메시지)만 봐서는 절대 못 잡음
(로컬 커밋 메시지도 실제 코드 변경분과 100% 일치해 보였음), 오직
`git fetch origin && git log HEAD..origin/main` 로 실제 원격 대조해야
드러남.

**fix (cycle 2197)**: `git fetch origin` → `git merge origin/main` (TODOS.md
1건 conflict, 양쪽이 동일 cycle 2196 항목을 중복 추가한 것이라 단순 dedup
후 커밋) → 실제 배포본 파일 확보 확인 (`buildMlbMatchupData`/`TeamMatchupCards`
generalize 코드 정상 존재, `tsc --noEmit` clean) → 코드 자체엔 새 버그
없음(구조가 KBO `buildMatchupData` 와 parity 정확, cycle 2117/2160 기존
버그들도 이미 해소된 상태 확인) → 본 사례 문서화. 40-ahead 커밋 자체는 이번
cycle 에서 origin 에 push 하지 않음(대량 과거 커밋 일괄 push 는 CI 검증
우회 리스크 — 별도 후속 검토 필요).

**carry-over (다음 fix-incident/skill-evolution 검토 필요)**:
1. 로컬 main 의 40-ahead 커밋들을 origin 에 정리 push 할지(예: 별도 브랜치로
   재구성 후 PR) 아니면 그대로 두고 매 cycle 마다 diagnosis 단계에서
   `git fetch && git merge` 를 습관화할지 결정 필요.
2. develop-cycle SKILL.md "세션 시작 시 필수 스캔" 또는 CLAUDE.md 스캔
   체크리스트에 `git fetch origin -q && git log HEAD..origin/main --oneline`
   한 줄 추가 검토 — 매 cycle 진단 단계에서 원격 대조를 기계적으로 강제하면
   본 사례 재발을 진단 즉시 잡을 수 있음.
3. 이 divergence 가 이번 세션(수동 invocation)에만 국한된 건지, 다른
   worktree/자동화 경로에서도 반복되는지 다음 발견 시 확인.

**관련 family**:
- 사례 8/11 (체크포인트 주장 vs 실제 불일치) — 대상이 메모리/체크포인트가
  아니라 로컬 git 워킹 디렉토리 자체라는 점에서 변형
- 사례 17 (`gh run list` 로 CI 파이프라인 실 여부 확인 필수) — 여기선 CI/PR
  자체는 전부 정상 성공했으나, 그 성공이 로컬 checkout 에 반영 안 된다는
  별개 레이어의 맹점
- 사례 18 (retro 완료형 서술 vs 실제 미실행) — cycle 2196 retro 는 실제로
  머지까지 확인하고 정확히 서술했음(사례 18 mitigation 정상 작동, 재발
  아님) — 다만 "머지됨" 이 "내 로컬에도 반영됨" 을 의미하진 않는다는 새
  구분선을 드러냄

**재발 + 근본 원인 규명 (cycle 2198 fix-incident)**: cycle 2197 이 "해소
SUCCESS" 로 retro 박제한 직후 cycle 2198 시작 스캔에서 즉시 재발 확인
(local 44-ahead / origin 1-behind). 원인 = cycle 2197 의 "fix" 가 그 순간의
divergence 만 merge 로 해소했을 뿐, **merge 후 `git push` 를 실행하지
않음** — R4 (커밋 정책) 이 "즉시 commit" 만 명시하고 "즉시 push" 는 명시한
적 없었던 것이 진짜 근본 원인. `gh pr list` 대조 결과 origin 은 사실
매 cycle 마다 정상적으로 push/PR-merge 돼왔음(cycle ≤2196 까지 로컬-origin
lockstep 확인) — 유독 cycle 2197 세션에서만 merge commit 이후 push 누락.
carry-over #1 (40-ahead 정리 방식) 은 "그대로 두고 매 cycle merge 습관화"
쪽으로 판명 났으나, **merge만으론 부족 — merge 뒤 push 까지가 완결**임을
확인.

**fix (cycle 2198, 재발 방지 — 이전엔 임시 sync 만, 이번엔 근본 원인 수정)**:
1. `git fetch` → `git merge origin/main` (TODOS.md 1건 conflict, 서로 다른
   cycle 항목이라 양쪽 유지 후 커밋) → **`git push origin main`** 즉시 실행
   (pre-push hook lint/type-check 통과 확인, `f063815f..e9b58b57` 정상 반영)
2. `CLAUDE.md` R4 규정 자체를 수정 — "커밋 직후 push 도 즉시 실행" 을
   명문화 (기존엔 "즉시 commit" 만 있고 push 언급 자체가 없었음). 이 문서
   갱신이 이번 fix 의 핵심 — 단순 sync 반복이 아니라 재발을 구조적으로
   차단.

**관련 family (추가)**:
- 본 사례가 사례 8/11/17/18 계열 중 최초로 "root cause 문서 수정"까지
  도달한 사례 — 이전 발견들(사례 33 최초 cycle 2197)은 그 순간의 증상만
  해소하고 재발 방지 장치를 남기지 않아 즉시 재발. silent drift family
  대응 시 "이 순간 상태 동기화" 와 "재발 차단 장치 설치" 를 구분해서 둘
  다 완료해야 retro 의 SUCCESS 가 유효하다는 교훈.

## 사례 20 (cycle 2350 fix-incident): 허브 `lesson-pending` reminder 18건 누적 — version-sync-guard race 미close 백로그

**발견**: cycle 2350 진단 단계에서 `gh issue list --state open` 확인 시
`hub-dispatch` 라벨 issue 는 0건이었으나, 별도 `lesson-pending` 라벨
reminder 가 18건 누적 (issue #3021~3038). 허브 `incident-followup.yml`
(Phase 4a D5) 이 매일 fingerprint 매칭 → 대응하는 `lesson:` commit 없이
3일 이상 경과한 hub incident 마다 자동 생성. develop-cycle 진단 단계
체크리스트가 `hub-dispatch` 라벨만 확인하고 `lesson-pending` 라벨은
누락 — 18건이 조용히 쌓이도록 방치된 구조적 맹점.

**root cause 규명**: 18건 중 14건(`ci-main-*`)이 전부 2026-08-19~20
(cycle 2246~2281) 구간 동일 원인 — `version-sync-guard.test.ts`
(사례 사전 정의, cycle 2047 신규) 가 VERSION 파일과
`apps/moneyball/package.json` 버전 mismatch 를 잡는 가드인데, 그 구간
fix/policy 커밋이 빠르게 연속되며 VERSION bump 가 package.json bump 와
같은 커밋에 원자적으로 안 들어간 순간들이 있어 그 사이 커밋의 CI 가
일시 실패 (`0.5.62.38 vs .39`, `0.5.62.60 vs .61` 등). 2026-08-20 이후
커밋부터는 VERSION/package.json×2/CHANGELOG 를 한 커밋에 원자적으로
묶는 관행이 정착돼(커밋 메시지에 "VERSION 0.5.62.X→Y" 또는 "bump
X→Y" 명시) 재발 0건 — 현재 HEAD 기준 CI 전량 green. 나머지 4건은
develop-cycle feature branch pre-merge 반복 실패(R7 정책상 CI green
후에만 squash 머지되므로 브랜치 자체 삭제됨, 최종 머지본은 영향 없음)
+ fingerprint/title 불일치 1건(허브 archive 재처리 라벨링 이슈 추정).

**fix (cycle 2350)**: 18건 모두 원인 규명 코멘트와 함께 close (코드
수정 불필요 — 이미 자연 해소된 케이스). 코드 자체는 변경 없음(가드
테스트는 의도대로 작동 중이며 유지).

**carry-over (다음 fix-incident/skill-evolution 검토 필요)**:
1. develop-cycle 진단 체크리스트의 "open GH issues 우선" 단계가
   `--label hub-dispatch` 만 확인 — `lesson-pending` 라벨도 함께
   스캔하도록 skill 갱신 검토(다음 skill-evolution 발화 시 반영 후보).
2. VERSION 원자적 bump 관행이 "코드 가드"가 아니라 "매 커밋 시 기억"에
   의존 — 재발 방지 장치가 문서/습관 수준. 향후 pre-commit hook 또는
   CI 자체에서 VERSION/package.json 자동 sync 스크립트화 검토 여지.

**관련 family**:
- 사례 15 (develop-cycle 자체 retro/dispatch layer silent) — 여기선
  허브 dispatch reminder 채널 자체가 진단 스캔 사각지대였다는 변형
- 사례 17 (`gh run list` 로 CI 파이프라인 실 여부 확인 필수) — 이번엔
  과거 실패 run 의 근본 원인까지 역추적해 "이미 해소됨" 을 실측 검증한
  사례

**2차 재발 (cycle 2464)**: 동일 fingerprint family (`ci-main-*`, 전부
2026-08-20 커밋 — 872f4de9/7c58ab68/2c2b6c11/1a58198a/7ab993d8/2bc43556)
의 lesson-pending reminder 6건(#3055~3060)이 2026-08-23 21:00 새로 생성.
cycle 2350 이 close 한 #3021~3038 배치와 별개 hub incident 번호
(#3483~3514) — 같은 2026-08-20 race 구간의 다른 커밋들이 다음날 3일
경과 기준 순차적으로 reminder 화된 것으로, 신규 recurrence 아님.
`gh run view <run> --log-failed` 로 6건 전부 `version-sync-guard.test.ts`
동일 assertion 실패(package.json 버전 1틱 차이) 확인 후 원인 코멘트와
함께 close. cycle 2437/2445/2452 의 `scripts/bump-version.sh` 원자적
bump + pre-push hook 도입(2026-08-23) 이후 커밋은 전량 CI green — 근본
원인은 이미 해소, 이번 6건은 fix 이전 시점 stale reminder 뿐이었음.
carry-over #1 (lesson-pending 라벨 진단 스캔 추가) 은 아직 미반영 —
다음 skill-evolution 발화 시 재검토 필요.
