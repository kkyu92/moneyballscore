# TODOS

## ✅ Resolved Lessons
- `fp:vercel-deploy-1e80b78` (2026-04-22): Sentry /webhook sub-path 3회 실패 → no-relay=true 태그로 해결 (박제 2026-04-29)

## 🚀 Next-Up (2026-04-25 이후)

### ⭐ develop-cycle zero-touch — 사용자 영역 후속 작업 (2026-05-02 spec/plan/구현 완료 후)

본 메인 영역 (`tools/zero-touch/`) 구현 + 통합 시뮬 통과 완료. 작동하려면 사용자 영역 4가지 필수:

- [ ] **tmux alias 추가** — `~/.zshrc` 에 `alias mcc='tmux new -As claude claude'`. 평소 `mcc` 로 claude 띄우기
- [ ] **글로벌 SKILL.md 갱신** — `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` 의 본문을 `~/.claude/skills/develop-cycle/SKILL.md` 로 cp. 검증: `grep -E "chain pool|cycle_state|fix-incident" ~/.claude/skills/develop-cycle/SKILL.md`. 6 chain 이름 + chain pool 단어 + cycle_state 단어 모두 grep 명중 시 OK. draft 본문 핵심 = chain pool 6개 (fix-incident / explore-idea / polish-ui / review-code / operational-analysis / dimension-cycle) + cycle_state JSON Med 깊이 + 4 단계 갱신. spec: `docs/superpowers/specs/2026-05-02-develop-cycle-skill-chain-design.md`. plan: `docs/superpowers/plans/2026-05-02-develop-cycle-skill-chain.md`
- [ ] **TELEGRAM_WEBHOOK 환경변수 결정 + install** — 기존 텔레그램 outbound 인프라 webhook URL 사용. `export TELEGRAM_WEBHOOK=... && tools/zero-touch/install.sh` 실행
- [ ] **첫 fire 검증** — tmux 안에서 `/develop-cycle 3` 호출 → 1 사이클 끝 → watcher 가 자동 reset → 다음 N=3 자동 시작 확인. 1주차 fine-tune (sleep 3/8 타이밍 등). spec section 8 검증 항목 7개 점검

**관련**:
- spec: `docs/superpowers/specs/2026-05-02-develop-cycle-zero-touch-design.md`
- plan: `docs/superpowers/plans/2026-05-02-develop-cycle-zero-touch.md`
- 운영 매뉴얼: `tools/zero-touch/README.md`

### ⭐ AdSense fix-first batch (2026-04-28 D7=A 결정 후)

mid-review 워크플로 (`docs/superpowers/specs/2026-04-28-moneyball-mid-review-workflow-design.md` § 10) archive (실행 안 함). codex outside voice 의 "fix-first 가 직접 path" 채택. 1주 작업 list.

#### ✅ 완료 (2026-04-28)

- **#2 AdSense 스크립트 인프라** (커밋 `5c3588a`): `apps/moneyball/src/app/layout.tsx` head 에 env-driven `<script async>` 추가. `ADSENSE_PUBLISHER_ID` (`pub-\d{16}`) 검증 시 자동 주입, 미설정 시 무동작. ads.txt route 와 동일 패턴.

#### ⏸️ Publisher ID 발급 후 처리 (자연 트리거)

- **#1 ads.txt 활성화**: `vercel env add ADSENSE_PUBLISHER_ID production` (값 `pub-xxxxxxxxxxxxxxxx`). 이후 무코드 변경, 재배포만으로 ads.txt 와 head script 동시 활성
- **#3 privacy 문구 갱신**: `apps/moneyball/src/app/privacy/page.tsx:44, 62` "도입 예정" → "이미 적용" (실제 광고 노출 후라야 정직)

#### 🌱 사용자 영역 (자연 진행)

- **#4 Google Search Console 색인 요청 10건** — 시간 날 때
- **#5 콘텐츠 깊이 보강** — 지속

#### 📌 메타

- 기존 인프라 점검 결과 ads.txt route 는 이미 env-driven (`apps/moneyball/src/app/ads.txt/route.ts`). codex finding #3 "ads.txt placeholder" 의 정확한 진단은 "publisher ID 미발급" 상태였음
- 4/28 17시 cron 자연 검증 — `pipeline_runs?run_date=eq.2026-04-28&mode=eq.predict` 8건 모두 `errors=[]` + `daily_notifications.summary_sent=true` (07:19 UTC). **사례 8 (summary silent fail) CLAUDE.md 추가 1주 누적 후 재평가**로 보류 (D10a 갱신, 단일일 표본)

### ⭐ GH Actions schedule → Cloudflare Worker 이관 backlog (2026-04-29~)

GH high-load skip 측정 → Cloudflare Workers Cron 으로 단계적 이관. 무료 tier (Workers Free 100k req/day, 계정 cron 5 trigger 제한).

#### ✅ 완료 (2026-04-29)

- **daily-pipeline** GH schedule 영구 비활성화 (`21a77b2`). Cloudflare `moneyballscore-cron` Phase 1 이관 (4/27 deploy + 4/28 안정 검증 errors=[] 8/8 + summary_sent=true). workflow_dispatch 보존
- Cloudflare cron 4 → 1 합침 (`03a4867`) — `"17 0-14 * * *"` 단일. `decideMode()` 가 UTC hour 보고 mode 분기. 계정 cron quota 4개 여유 확보
- **sitemap-warmup + live-update Cloudflare 이관** (`a6649c8`). worker.ts `event.cron` 3개 분기 (17 0-14 / 37 * / */10 9-15). SITE_URL var 추가. wrangler version `ef28c350`. 두 GH yml schedule 키 제거, workflow_dispatch 보존. 총 fire/day = 81 (Workers Free 100k 여유)

#### ✅ 완료 (2026-04-30)

- **sync-batter-stats** GH schedule 영구 비활성화. Cloudflare Worker `"17 0-14 * * *"` UTC 03:17 조건 분기에 `runBatterSync()` 추가 — 별도 cron slot 소비 없이 기존 cron 재사용. 총 fire/day = 82 (Workers Free 100k 여유).
- **pitcher-snapshot Cloudflare 분기 통합** — `'37 * * * *'` 분기 내 UTC 토요일 15h 조건 추가 (`runPitcherSnapshot()`). cron 슬롯 4/5 유지 (`03a4867` 정신 보존). `pitcher-snapshot.yml` schedule 키 제거, workflow_dispatch 보존.

#### ✅ 완료 (2026-04-30) — Cloudflare 이관 전체 완료

- **pat-expiry-check.yml GH 유지 결정** — GH Actions 에서 실행 유지.
  - GH PAT 만료일 체크 + `playbook` 리포에 dispatch → GH 컨텍스트(secrets + gh api) 안에서 도는 게 본질에 맞음.
  - CF 이관 시 PAT 를 CF secrets 에도 보관해야 해 보안 표면 증가 + audit trail 저하.
  - 월 1회 빈도 → GH schedule skip 위험 (4/27 측정: 일간 cron 41% skip) 허용 가능.
  - **ROI 없음** — GH 유지가 더 안전하고 자연스러운 위치.

#### ⏹ 폐기 (2026-04-30) — agent-loop 자율 cron 라인

- **self-develop.yml** 삭제 + cloudflare worker `dispatchSelfDevelop` 분기 제거 (commit `cd79274`).
  - 이전엔 UTC 00:17 (KST 09:17) self-develop 자율 fire → 이제 사용자 직접 호출 `/develop-cycle [N]` skill 로 전환.
  - 폐기 이유: 자연발화 cron 의 자율성 매력 < 진단 비용 (runner 휘발 worktree, OAuth 회전, push step 누락 사고). 사용자 직접 trigger 가 더 명확.
  - 후속: `~/.claude/skills/develop-cycle/SKILL.md` (3 차원 + Agent Teams + iTerm2 native 분할). 시범 운행은 다음 세션부터.

#### 검증 path (각 이관 시)

1. worker.ts 분기 추가 + wrangler.toml cron 추가 (계정 quota 1개 소비)
2. `pnpm run deploy` (cloudflare-worker)
3. 자연 fire 1 cycle 검증 (Cloudflare logs + Supabase row 박힘 확인)
4. GH schedule 키 제거 + workflow_dispatch 보존
5. commit

#### 본 세션 (2026-04-29) 자연 fire 검증 path

- sitemap-warmup: KST 10:37 (UTC 01:37) 첫 fire — wrangler tail 또는 Vercel log
- live-update: KST 18:00~ 첫 fire — wrangler tail 또는 Supabase row (postview 자동 트리거 분기 정상 동작 확인 필수)
- 회귀 시 wrangler rollback 가능

### ⭐ 분석 축 — v4-3 자연 발화 관찰 결과 (2026-04-24 실행 + 2026-04-27 후속)

2026-04-24 KST 오전 세션에서 TODOS 체크리스트 A~F 실 DB 조회. **v4-3 핵심은 작동**. 누락 가설은 2026-04-27 후속 조사로 정정 — 대부분 false alarm 이었고 진짜 버그 2건 (스크래퍼 status 오판정 + pipeline_runs.mode VARCHAR overflow) 별도 fix.

#### ✅ 통과 (2026-04-24)
- **A**: 어제(2026-04-23) `predictions.prediction_type='post_game'` row **5건** (경기 수 일치)
- **B**: Sonnet 심판 실제 factor-level reasoning 생성 (fallback 한 줄 아님)
- **C 부분**: 생성된 경기는 **home+away 양쪽 memory 정확히 생성** (v4-3 버그 수정 확인)
- **E**: `agent_memories` UNIQUE 제약 작동, duplicates 0

#### ✅ C1 정정 — false alarm (2026-04-27)

원 가설: "4/23 5경기 중 2726/2727 만 memory 0 row → 누락 버그".
실제 원인: `retro.ts:203` 의 `.eq('is_correct', false)` — **틀린 예측에만 mem 생성** 의도된 동작. 2726/2727 은 예측 적중 → mem 생성 안 함이 정상.

4/23~4/26 4일 검증: wrong 예측 수 × 2 = actual mem 수 100% 일치 (4/23 wrong=3 mem=6, 4/24 wrong=3 mem=6, 4/25 wrong=2 mem=4, 4/26 wrong=3 mem=6). **agent_memory 버그 없음**.

부수 디자인 검토 가치:
- wrong 만 학습 → 적중 패턴(strength) 도 학습할 가치는? 현재는 wrong 에서 추출한 strength/weakness 만 있음
- content 에 date 포함 → UNIQUE 사실상 매번 새 row → 일별 누적

#### ✅ 진짜 버그 2건 fix (2026-04-27)

**버그 1 — `kbo-official.ts:96` status 오판정** (4/26 LG@OB / KT@SK 영구 누락 직접 원인):
- KBO API 가 경기 시작 전에도 `GAME_INN_NO=1` 을 미리 set 하는 케이스 발견
- `state_sc='1' + inn_no=1` raw 가 'live' 로 오판정 → `shouldPredictGame` 이 not_scheduled reject
- Fix: `Number(inn_no) > 0` OR 절 제거. `state_sc='2'` 단독 신뢰. kbo-live.ts 도 동일 수정. regression test 4건 추가 (358 pass)
- 커밋 `5cc001f`

**버그 2 — `pipeline_runs.mode VARCHAR(10)` overflow** (4/25, 4/26 predict_final cron 결과 silent 손실 + 4/26 summary 알림 누락 상위 원인):
- migration 004 의 mode 컬럼 VARCHAR(10) 가 'predict_final' (13자) 거부 → ERROR 22001
- supabase-js .error silent 리턴 → finish() try/catch 안 잡힘 → pipeline_runs 에 한 row 도 안 남음
- CLAUDE.md 사례 3 (`predictions.model_version 'v2.0-debate'`) 와 동일 패턴 재발
- Fix: migration 019 (VARCHAR(10)→VARCHAR(20)) + finish() 의 .insert() .error 가드 추가
- 커밋 `71a1cbc`

#### ⚠️ 다음 세션 과제

**C2. GitHub Actions schedule skip 재발 대응** (잔존)
- `live-update.yml` 2026-04-23 24h 구간 **5회만 실행** (기대 42회)
- 4/23, 4/25, 4/26 announce cron (UTC 00:17) skip — 4/24 만 수동 회복
- 분 17 오프셋만으로 부족. 구조 대응 후보: (a) 오프셋 분산 30 또는 45 (b) 두 시각으로 dual-fire (c) Vercel Cron 이관 (d) 외부 polling
- 결정 전 데이터 필요: 최근 7일 skip 패턴 / 시간대별 skip 비율
- **2026-04-27 진행**: Cloudflare Worker 이관 (Phase 1) deploy 완료. 4/28 09:17 KST 자동 cron fire 자연 검증 대기. Worker 안정 검증 후 GH Actions schedule 영구 비활성화 예정.

**SP 확정 측정 — Naver 이중 source 추가** (2026-04-27 추가, 데이터 누적 대기)
- migration 020 + 021. Worker 가 KBO 공식 + Naver `schedule/games?fields=all` 양쪽 호출 → `source='kbo-official'`/`'naver'` 양쪽 row 적재
- 가설: KBO 만 polling 으론 "Naver 가 SP 더 빨리 채울 수 있는지" 검증 불가. 1주 데이터 후 정량 비교
- 분석 SQL 5종 미리 박음 (`cloudflare-worker/README.md` Phase 3 섹션): Q1 game/source 별 첫 확정 / Q2 KBO vs Naver 비교 / Q3 redundancy 분포 / Q4 lead-time 분포 / Q5 SP 변경 사례
- 결정 기준: Q3 의 `naver_only`+`naver_first` ≥ 5% → fallback 도입. < 1% → redundancy 만 남기고 종료

**F. Layer-1 validator reject 메트릭** (보류, 자연 발생 대기)
- TODOS 원 문구 "validator_logs 테이블" 은 실제로 `violation_type/severity/detail/backend` 구조 — **명예훼손/hallucination 감지용** (`/debug/hallucination`)
- Layer-1 (JSON 파싱 + schema) reject 율은 별도: Vercel Functions 로그에 `[Validator]` prefix grep 만 가능 (1시간 후 휘발)
- **2026-04-27 결정 — 보류**: validator strict mode 가 본래 빡빡한 검증 아님 → 4주 누적해도 reject 율 0~1% 예상. 측정 도구를 데이터 없이 먼저 만드는 패턴은 "데이터로만 이야기" 정신 위배. 진짜 reject 다발 사례 자연 발생 (Sentry alert 또는 사용자 보고) 시 → 그때 DB 기록 path (validator_logs 에 violation_type='layer1_schema' 추가) 30분 작업으로 추가

#### 🎯 분석 축 후속 (C1~F 해결 후 착수)
- **A** `/analysis` 허브 확장 (전날·주간·비-빅매치 경기 진입점) — **(2026-05-01 진행 중)** 어제 경기 진입점 PR #31 (`develop-cycle/20260430-analysis-hub-entries`, develop-cycle 첫 시범 fire). 주간/비-빅매치 진입점은 후속 cycle.
- **B** 모델 성능 분석 사용자 가시화 (`/debug/*` → `/dashboard` 공개 섹션 이식)
- **D** v2.0 튜닝 준비 (50경기 축적 시점 도달 후)
  - **2026-04-28 진행**: verified=37건. 적중률 추세 — 4/15 100% → 4/17~19 80% → 4/21~22 50% → 4/23~26 38%. 명확한 하락 신호 (단 표본 작음, 95%CI ±25%p)
  - **2026-04-28 사전 검증 — 인프라 이미 완성**:
    - `/debug/model-comparison` 페이지 + `compareModels.ts` (`extractPureQuantProb` / `buildShadowRows`) + 테스트 모두 작동 중
    - `daily.ts` 가 v1.6 ship (4/22) 이후 모든 v2.0-debate row 에 `reasoning.quantitativeHomeWinProb` 박는 중. shadow 보존률 v1.5 시기 0% (n=16) / v1.6 시기 100% (n=21)
    - 21건 (v1.6, 4/22~26) 비교 결과: v2.0-debate Accuracy 38.1%(8/21) Brier 0.26817 / v1.6-pure-shadow Accuracy 23.8%(5/21) Brier **0.25768** — debate 가 winner +14%p 우세, shadow Brier 미세 우세, 21건 중 winner 불일치 3건 (확률값 차이 평균 2.26%p)
    - **재예측 함수 작성 작업 무산** (인프라 자동 처리). v1.5 시기 16건 retroactive 는 ROI 낮아 보류
  - **5/1 KST 09:00 자연 트리거** (4/30 verify 완료 후 verified ≥ 50 도달 예상): `/debug/model-comparison` 페이지 한 번 열어 v1.6-pure-shadow vs v2.0-debate 결과 확인 + 아래 H1~H4 가설 검증
  - 결정 기준: v1.5 적중률 ≥ v2.0+5%p → v1.5 회귀 검토 / v2.0 적중률 ≥ v1.5+5%p → v2.0 유지 + 가중치 튜닝 / 차이 < 5%p → 표본 더 축적 후 재평가

#### 🔬 5/1 자연 트리거 가설 후보 4건 (2026-04-28 추출, N=37)

가설 nominate 만. 검증 전 가중치 변경/모델 수정 절대 금지 ("데이터로만 이야기"). 5/1 N≥50 도달 시 아래 SQL 일괄 실행.

**H1. confidence ≥ 0.6 만 가치 있음. 그 이하는 random 수준** ⭐ 강한 신호

| confidence | n | 적중률 |
|---|---|---|
| [0.45, 0.50) | 3 | 33% |
| [0.50, 0.60) | **26** | **50%** ← random |
| [0.60, 0.63] | 8 | **75%** |

전체 70%(26/37)가 random 구간. confidence ≥ 0.6 그룹만 winner 적중 의미 있음.

검증 SQL:
```sql
SELECT
  CASE WHEN confidence >= 0.6 THEN 'high' ELSE 'low' END AS bucket,
  COUNT(*) AS n,
  AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) AS accuracy,
  -- Wald 95%CI 반폭
  1.96 * SQRT(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) *
              (1 - AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END)) / COUNT(*)) AS ci95
FROM predictions WHERE is_correct IS NOT NULL AND scoring_rule = 'v1.6'
GROUP BY 1;
```
결정 기준: high 그룹 적중률 - low 그룹 적중률 ≥ 15%p && 95%CI 비중첩 → H1 확정 → low confidence 예측 사용자 노출 정책 재검토.

**H2. 원정 예측은 random 보다도 약함** ⭐ 강한 신호

- 홈 예측 22건 → 적중 59% (+9%p)
- 원정 예측 15건 → 적중 47% (random 이하)
- 실제 홈 승률 57% (페이지 base 51% 대비 +6%p, 4월 표본 편향)

검증 SQL: `extractHomeWinProb(reasoning) >= 0.5` 그룹 vs `< 0.5` 그룹 Accuracy/Brier 비교.

결정 기준: 원정 예측 그룹 적중률 < 50% && N ≥ 25 → H2 확정 → 원정 신호 보강 (원정팀 recent_form 가중치, away SP 신호 강화 등) 후보.

**H3. 시즌 초 표본 함정 — SP FIP 차이가 거의 0**

|SP FIP diff|: 36/37건이 0.5 미만, 1건만 1.0~2.0. SP FIP 가중치 19% (가중치 1위) 인데 차별화 정보 거의 없음. 4월 초 투수 시즌 표본 5경기 안팎.

검증 SQL: 4/15~5/1 SP FIP 평균 + |diff| 분포 추세. |diff| ≥ 0.5 비율이 시간에 따라 늘면 자연 회복, 안 늘면 구조적 약점.

결정 기준: 5/1 시점 |diff| ≥ 0.5 비율 ≥ 30% → 자연 회복 / < 15% → SP 데이터 갱신 빈도 점검 (KBO Fancy Stats 스크래핑 cron 동기성).

**H4. 시간 추세 — 평균 회귀일 가능성 (가장 큰 의심)**

| 기간 | 적중 | % | binomial(p=0.5) |
|---|---|---|---|
| 4/16-17 | 7/7 | 100% | 0.78% |
| 4/18-21 | 5/9 | 56% | random 근처 |
| 4/22-26 | 8/21 | **38%** | random 이하 |

4/16-17 의 7/7 = binomial(p=0.5) 0.78% 확률. 매우 운 좋은 초기 + 평균 회귀 가능성. 50건 누적 적중률 ≈ 50% 면 **모델 = 동전 던지기** (구조 재설계 필요).

검증 SQL:
```sql
SELECT
  COUNT(*) AS n,
  AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) AS overall_acc,
  -- 95%CI
  1.96 * SQRT(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) *
              (1 - AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END)) / COUNT(*)) AS ci95
FROM predictions
WHERE is_correct IS NOT NULL AND scoring_rule = 'v1.6';
```
결정 기준: N ≥ 50 && overall_acc ∈ [0.45, 0.55] && 95%CI 가 0.5 포함 → H4 확정 (모델 = random) → v3 설계 (다른 데이터 소스, 다른 모델 구조) 검토.

**H5. v1.6 가중치 변경이 prod 에서 v1.5 보다 더 나쁨** ⭐⭐ 가장 강한 신호 (H4 와 함께)

2026-04-28 중간점검에서 추출. v1.5/v1.6 시기 분리 분석 시 발견:

| scoring_rule | 기간 | n | 적중 | acc | binomial(p=0.5) 우연 |
|---|---|---|---|---|---|
| v1.5 | 4/15-21 | 16 | 12 | **75.0%** | 0.11% |
| v1.6 | 4/22-26 | 21 | 8 | **38.1%** | 17% (random 이하) |
| 격차 | | | | **36.9pp** | |

4/22 v1.6 ship (`CHANGELOG v0.5.24` — Wayback 백테스트 wOBA/FIP/SFR 추가, train Brier −0.00319) 이후 prod 적중률이 v1.5 대비 −37%p. CHANGELOG v0.5.26 의 game_records 8-feature backtest 도 이미 null-like 로 v1.7 ship 근거 없음 결론. **즉 wayback 백테스트 + game_records backtest 가 prod 와 정반대 방향 시그널**.

H4 와의 관계: H4 (모델=동전) 와 부분 겹침. 다만 H5 는 **v1.5 자체는 75% 로 동전이 아닐 가능성** + **v1.6 변경이 그 가치를 부순 가능성** 을 분리해서 봄. H4 가 random 이면 v1.5 75% 도 운, H5 가 맞으면 v1.5 회귀가 답.

검증 SQL:
```sql
SELECT
  scoring_rule,
  COUNT(*) AS n,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS hits,
  AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) AS accuracy,
  -- Wald 95%CI 반폭
  1.96 * SQRT(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) *
              (1 - AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END)) / NULLIF(COUNT(*),0)) AS ci95
FROM predictions
WHERE is_correct IS NOT NULL
GROUP BY scoring_rule
ORDER BY scoring_rule;
```

결정 기준 (5/1 N≥50 시점):
- v1.5_acc ≥ v1.6_acc + 10pp && N(v1.6) ≥ 30 && 95%CI 비중첩 → **H5 확정 → v1.5 회귀 + v1.6 변경 폐기 + Wayback/game_records 백테스트 신뢰성 재검토**
- 격차 5~10pp → 표본 추가 (5/15 N≥80 재평가)
- 격차 ≤ 5pp → v1.6 유지 (H4 가설로 재해석 — 둘 다 random)

H4 와 H5 동시 검증: H4 가 N≥50 [0.45, 0.55] 면 v1.5 시기 75% 도 단순 운 → H5 자연 폐기 (v1.6 회귀 의미 없음). H4 가 0.55 초과 또는 0.45 미만이면 H5 유의미 → v1.5/v1.6 격차 분석 가치.

#### 🧪 5/1 09:00 자연 트리거 1차 검증 결과 (develop-cycle 1/1, model 차원)

`develop-cycle/20260501-model-h1-h5-verify-skip` (PR 후속 링크). 사용자 자연 발화는 없었으나 develop-cycle skill 의 5/1 자연 트리거 도달 → model 차원 1 사이클 자율 실행.

**진단 (Supabase REST 직접 조회, predictions 테이블)**:

| 지표 | 값 | 95%CI |
|---|---|---|
| N (전체 verified) | **47** | — |
| Overall acc | 23/47 = 48.94% | [34.6%, 63.2%] |
| H5 v1.5 (4/15-21) | 12/16 = **75.0%** | [53.8%, 96.2%] |
| H5 v1.6 (4/22+) | 11/31 = **35.5%** | [18.6%, 52.3%] |
| H5 격차 | **39.5pp** | CI 비중첩 (간발의 차: 53.8% vs 52.3%) |
| H1 high (≥0.6) | 6/8 = 75% | [42.0%, 100%] |
| H1 low (<0.6) | 17/39 = 43.6% | [28.0%, 59.1%] |
| H1 격차 | 31.4pp | high N=8 너무 작음 → 결론 보류 |
| H2 home pick | 15/26 = 57.7% | [38.7%, 76.7%] |
| H2 away pick | 8/21 = 38.1% | [17.3%, 58.9%] — N<25 미달 |

**결정: 표본 축적 (작업 없음, lesson only)**

근거:
1. N(전체)=47 < 50 게이트 미충족 (dispatch 결정 우선순위 첫 줄)
2. H5 하위 조건 (v1.5_acc ≥ v1.6_acc+10pp && N(v1.6)≥30 && CI 비중첩) 은 충족했으나, v1.5 표본 16건 중 7건이 4/15-17 디버그 시기 (드리프트 사례 3 — debug 커밋 3건과 같은 시기, 100% 적중 후 평균 회귀 의심) 와 겹침. 이 7건 제외하면 v1.5 N=9 로 신뢰도 급락
3. v1.6 적중률 35.5% 는 H4 (random=동전) 의 0.45~0.55 구간에서 벗어남 (lower) → v1.6 가 단순 random 이 아니라 **systematically wrong** 가능성 시그널 — 이게 사실이면 H5 회귀가 답이지만 표본 부족
4. CI 비중첩 격차가 0.5pp (53.8% vs 52.3%) — N 1~2건 추가/감소로 뒤집힐 수 있는 임계점

**메타-finding (5/1 신규)**: v1.6 시기 31건 중 high confidence (≥0.6) **단 1건** (그것도 0/1 적중). v1.5 시기 16건 중 high confidence 7건 (6/7 = 86%). v1.6 가중치 변경이 winner 적중률뿐 아니라 **모델 confidence 분포 자체를 압축** (대부분 0.5~0.6 구간으로 수렴). 이게 H1·H5 의 공통 메커니즘 가설 후보. 향후 검증 가치 높음.

**다음 트리거**: N=50 도달 시 (예상 5/3~5/5). 재검증 SQL 동일 (위 H5 SQL). 도달 시 즉시 v1.5 회귀 결정 가능하도록 `packages/shared/src/constants.ts` v1.5 가중치 git log 추적 미리 표시:
- v1.5 시기 마지막 commit (4/21 이전): TODOS H5 표 참조
- v1.6 ship commit: `CHANGELOG v0.5.24` (4/22) — 실제 dc07463 (`feat(engine): v1.6 가중치 재분배`)
- 회귀 PR 작성 시 `git show <v1.5-last-commit>:packages/shared/src/index.ts` 로 가중치 복원

#### 🎯 5/4 H5 N=62 자연 트리거 검증 결과 (cycle 14, operational-analysis lite)

`develop-cycle/h5-verified-v1.5-vs-v1.6-cycle14`. 5/1 → 5/4 사이 verify cron 으로 N=47 → 62. H5 결정 기준 모두 충족 → H5 확정.

**산출**: `docs/metrics/2026-05-04-h5-verified-cycle14.md` (180 줄, cycle 11/13 finding 과 통합 정리).

| 지표 | v1.5 (n=16) | v1.6 (n=46) | 격차 |
|---|---|---|---|
| Winner acc | 75.00% [53.78, 96.22] | 36.96% [23.01, 50.91] | 38.04pp |
| Brier | 0.2143 (random 이상) | **0.2559 (random 이하)** | +0.0416 |
| High conf (≥0.6) | 6/7 = 86% | **0/2 = 0%** | — |

**H5 결정 기준 (TODOS 박제)**: 격차 ≥ 10pp ✅ / N(v1.6) ≥ 30 ✅ / CI95 비중첩 ✅ (0.0287pp 마진) → **H5 확정**.

**cycle 11/13 통합 결론**: 단순 v1.5 회귀 답 아님. 3 측면 동반 fix —
1. **LLM 측면** (cycle 11→13 carry-over): `judge-agent.ts` / `postview.ts` SYSTEM_PROMPT 에 가중치 0% factor 추론 금지 (cycle 15 1순위, review-code chain)
2. **prod 측면** (본 cycle 14): v1.5 회귀 PR 검토 (cycle 15+ 2순위, fix-incident 또는 explore-idea, 큰 commit)
3. **정량 측면** (cycle 13 박제): Wayback 백테스트 (2023-2024 z-score) vs prod 2026 적중률 정반대 시그널 → 시즌 분포 변화 + 시즌 초 stat noise 가설 검토 (cycle 15+, explore-idea spec)

**cycle 15+ actionable 4건** (lesson md §6):
- 1순위 review-code: LLM prompt constraint → **cycle 15 PR #54 적용 완료** ✅
- 2순위 fix-incident/explore-idea: v1.5 회귀 PR (단 백테스트 재검토 동반)
- 3순위 operational-analysis: cycle ~25 N=100 시점 재측정
- ~~4순위 operational-analysis: 4월 vs 5월 분리 분석~~ → **cycle 16 청산 (H3 반증)** ✅

#### 🎯 5/4 H3 반증 — 시즌 초 stat noise 가설 (cycle 16, operational-analysis lite)

`develop-cycle/h3-disproved-month-split-cycle16`. cycle 14 의 4순위 (4월 vs 5월 분리) 청산. **H3 반증** → 시즌 초 noise 가설 폐기.

**산출**: `docs/metrics/2026-05-04-h3-disproved-cycle16.md` (170 줄, cycle 14 통합 결론 갱신).

| 구간 | N | acc | Brier | high(≥0.6) |
|---|---|---|---|---|
| v1.6 4월 | 31 | 35.48% [21.12, 53.05] | 0.2593 | 1/0 = 0% |
| v1.6 5월 | 15 | 40.00% [19.82, 64.25] | 0.2631 | 1/0 = 0% |
| **격차 (4 − 5월)** | | **−4.52pp** | (CI95 완전 중첩, 의미 X) | |

**4월 only 시간 control**: v1.5 75% vs v1.6 35.48% → **격차 39.52pp** (전체 38.04pp 보다 더 큼).

**판정**:
- H3 (시즌 초 noise) 반증 — 5월에 회복 시그널 없음 + 4월 only 격차 더 큼
- 시간 변수 통제 후에도 격차 유지 → v1.6 의 acc 저하는 **순수 모델 효과** (시즌 효과 X)
- 회귀 PR 결정 보류 사유 4건 중 2건 청산 (시즌 noise + LLM 갭 cycle 15 적용)

**cycle 17+ actionable 재정렬**:
- 1순위 fix-incident/explore-idea: v1.5 회귀 PR + Wayback 백테스트 재검토 (보류 사유 2/4 청산 → 정당성 보강)
- 2순위 operational-analysis cycle ~17: cycle 15 PR #54 prompt constraint 효과 측정 (1주 후)
- 3순위 operational-analysis cycle ~25: N=100 시점 H5 격차 trend 재측정

---

### Day 2 Search Console 색인 요청 (2026-04-25 이후)

Day 1 완료: `/`, `/predictions`, `/dashboard`, `/analysis`. 2026-04-24 재확인 결과 하루 10개 제한 모두 소진 → skip. 2026-04-25 한도 리셋 후 아래 10개 먼저 입력. 팀 프로필 10개는 Day 3 으로:

**Day 2** (이어서 10개):
5. `https://moneyballscore.vercel.app/reviews`
6. `https://moneyballscore.vercel.app/about`
7. `https://moneyballscore.vercel.app/teams`
8. `https://moneyballscore.vercel.app/players`
9. `https://moneyballscore.vercel.app/matchup`
10. `https://moneyballscore.vercel.app/reviews/misses`
11. `https://moneyballscore.vercel.app/privacy`
12. `https://moneyballscore.vercel.app/terms`
13. `https://moneyballscore.vercel.app/contact`
14. `https://moneyballscore.vercel.app/seasons`

**Day 3** (인기 팀 프로필 5개 + 최근 리뷰·경기):
- `/teams/HT`, `/teams/LG`, `/teams/OB`, `/teams/SS`, `/teams/SK`
- `/teams/KT`, `/teams/HH`, `/teams/LT`, `/teams/NC`, `/teams/WO`

**Day 4 이후 불필요**: 허브 색인되면 sitemap + 내부 링크로 Google 자동 발견.

### B3 (not_scheduled 재시도) — **데이터 누적 대기**

Part A 관측 결과 (2026-04-24 확인): **이상 status 발생 無**. 모든 skip 이 scheduler 로직 (`window_too_early/late`) 으로 정상. raw 동봉 케이스 아직 트리거되지 않음. 강제 트리거 어려우니 실제 `not_scheduled`/`sp_unconfirmed` 이벤트 발생 시까지 보류.

### 심화 SEO (우선순위 낮음)

- **`generateSitemaps` 로 sub-sitemap 쪼개기**: 현재 1340 URL 단일 파일. 2시즌 더 쌓이면 3000+. Next 16 `id: Promise<string>` breaking change 있음.
- **OG 이미지 점검**: `/analysis/game/[id]` 공유 시 썸네일 동적 생성 (`opengraph-image.tsx`)
- **Core Web Vitals 감사**: Lighthouse 또는 PageSpeed Insights. 개선 여지 발견 시 다음 세션

---

## ✅ 2026-04-23~24 세션 완료

### B1 / Part A / B2 관측 — **모두 정상**
- **B1**: cron 오프셋 17 적용 후 4-23 **7회 fire** (이전 4/15 대비 ↑). KST 16:02 predict 로 예측 5건 성공 생성. KST 23:14 verify success.
- **4-23 `is_correct`**: 5경기 전부 verified (2승 3패, 40%). 체크포인트 우려 해소.
- **Part A**: 이상 status 발생 無 (정상). raw 동봉 대기.
- **B2 체감**: 2026-04-24 KST 09:17 announce 에서 확인 예정.

### HIGH_CONFIDENCE_THRESHOLD 재정의 → winnerProb 3단계 단일 anchor (커밋 6450f60 외)

debate confidence 주관값 축 폐기, 예측 승자 적중 확률 (winnerProb = max(hwp, 1-hwp)) 로 전면 통일:
- `WINNER_PROB_CONFIDENT = 0.65` / `WINNER_PROB_LEAN = 0.55` (Telegram B2 와 통일)
- `classifyWinnerProb(hwp)` → `'confident' | 'lean' | 'tossup'`
- 3단계 라벨 "적중 / 유력 / 반반" + 이모지 pool 랜덤 (`pickTierEmoji`)
  - 적중 🔥 또는 🎯
  - 유력 📈 (단일)
  - 반반 🤔 또는 ⚖️
- UI 전수 반영: 홈/대시보드/예측기록/주간·월간 리뷰/회고
- 테스트 **519 → 536 pass**

### SEO — Sitemap "가져올수없음" 근본 해결 (커밋 da59de3)

- **원인 확정**: `createClient` → `cookies()` 호출 → Next.js 가 route 를 dynamic 으로 강제 → `revalidate` 무력화 → 매 요청 2500 DB 쿼리 → Googlebot timeout → "유형: 알수없음 / 상태: 가져올수없음"
- **해결**: sitemap 전용 cookie-free anon client 인라인 → **static + ISR** prerender
- `x-vercel-cache: HIT` 확인, Search Console **색인 생성됨** 도달
- 동시 조치: pitcher leaderboard 쿼리 제거, games limit 5000→2500, 전 URL lastmod, revalidate 3600→21600, warmup cron (매시간 37분)

### SEO 추가 보강 (커밋 e3f5cee)

- `robots.txt` — `/debug`, `/api`, `/search` Disallow
- canonical — 홈 + /analysis + dashboard/predictions/reviews/reviews-misses/about/teams/players + /analysis/game/[id]
- **SportsEvent JSON-LD** 추가 — /analysis/game/[id] (Article 과 병기). Google 리치 결과 후보 (팀·일정·구장)

### 외부 웹마스터 등록 (사용자 완료)

- Google Search Console ✅ (Day 1 4개 색인 요청 완료)
- Naver 웹마스터 ✅
- Bing Webmaster ✅
- IndexNow ⏭ 스킵

---

## ✅ PLAN_v5 완료 (v0.5.23, 2026-04-20)

**전체 Phase 완료**:
- ✅ Phase 1 UI (LEFT JOIN + PlaceholderCard + estimateTime) — v0.5.22
- ✅ Phase 2 Pipeline (매시간 cron · shouldPredictGame · ON CONFLICT · daily_notifications · 4-mode) — v0.5.22
- ✅ Phase 2.5 DB 기반 form/h2h (asOfDate 실 필터 구조적 해결) — v0.5.22
- ✅ Phase 3 `/debug/pipeline` 대시보드 — v0.5.22
- ✅ Phase 4 가드 테스트 (382 tests: schedule 24 + scrapers 16 + notify 11 + pipeline-daily 15 + ui-homepage 16 + 기존) — v0.5.23

**다음 단계** — PLAN_v5 후속:
- **자연 발화 관찰** (KST 09:00 부터 첫 사이클):
  - UTC 00 (KST 09) announce → Telegram 수신 + `/debug/pipeline` 기록
  - UTC 01-12 predict 매시간 → 각 경기 시작 3h 이내 처음 cron 에만 row 1건 생성
  - UTC 13 predict_final → gap=0 확인
  - UTC 14 verify → accuracy update + notifyResults
- **Phase 5 v2.0 튜닝** (2주 운영 후): stat 누수 차단된 데이터셋 기반 오차분석. ~50경기 축적 시점부터 별도 세션 플래닝.

---

## 🔍 Phase v4-3 자연 발화 관찰 (2026-04-16 이후)

**목적**: v4-3에서 신규 추가한 자동 postview 트리거·Compound 루프가 실제 KBO 경기 종료 시 작동하는지 확인. 프로덕션 재트리거 1회로는 scheduled 상태만 검증됐고, `post_game` row·`agent_memories` row 생성은 실제 완료 경기가 있어야 검증 가능.

### 체크리스트 (매일 경기 후 1회)

**A) Postview 자동 생성 확인**
```sql
-- 어제 날짜 post_game row 개수 (Supabase SQL Editor)
SELECT count(*) FROM predictions
WHERE prediction_type = 'post_game'
  AND game_id IN (SELECT id FROM games WHERE game_date = CURRENT_DATE - INTERVAL '1 day');
```
- **기대**: 어제 완료 경기 수와 일치 (보통 5)
- **0이면**: live-update.yml 트리거 실패 or runPostviewDaily 에러 → GitHub Actions 로그 확인

**B) Postview 내용 샘플링**
```sql
-- 최근 post_game row 1건의 reasoning 구조 확인
SELECT game_id, reasoning->'factorErrors' AS factor_errors,
       substring(reasoning->>'judgeReasoning', 1, 200) AS reasoning_preview
FROM predictions
WHERE prediction_type = 'post_game'
ORDER BY created_at DESC LIMIT 1;
```
- **기대**: `factorErrors`에 실제 factor 이름(`home_sp_fip` 등), `reasoning_preview` 한 줄 이상 (fallback 한 줄 아님)
- **fallback만 나오면**: Sonnet 호출 실패 → API 크레딧·모델 ID 확인

**C) agent_memories home/away 양쪽 생성 확인**
```sql
-- 어제 경기 기반 memory 개수 + 팀 분포
SELECT team_code, memory_type, count(*)
FROM agent_memories
WHERE source_game_id IN (SELECT id FROM games WHERE game_date = CURRENT_DATE - INTERVAL '1 day')
GROUP BY team_code, memory_type
ORDER BY team_code;
```
- **기대**: 경기당 최대 2개 row (home 팀 + away 팀), memory_type 다양하게 분포
- **한쪽 팀만 보이면**: `retro.ts` home/away 버그 수정이 실제 런타임에서 작동 안 함 → 긴급

**D) live-update.yml cron 윈도 확장 확인**
- GitHub Actions → `Live Game Update` workflow → 18:00~00:50 KST 시간대에 10분 간격 실행 로그
- **기대**: 약 43회 실행 (2h 확장분 포함), 대부분 "no active games" 즉시 종료
- **23:30 이후 실행 없으면**: workflow 파일의 cron이 적용 안 됨

**E) UNIQUE 제약·upsert 멱등성 확인**
```sql
-- 같은 (team_code, memory_type, content) 중복 없는지
SELECT team_code, memory_type, content, count(*)
FROM agent_memories
GROUP BY team_code, memory_type, content
HAVING count(*) > 1;
```
- **기대**: 0 rows (UNIQUE 제약 때문에 구조적으로 불가능)
- **row 있으면**: migration 009 제약이 비활성화됨 → 긴급

**F) validator reject 율 (Claude strict)**
- Vercel/pipeline 로그에서 `[Validator]` 키워드 grep
- **기대**: 0건 또는 극소수 (Claude는 compliance 높음)
- **증가하면**: 프롬프트 튜닝 필요 (페르소나·RESPONSE_FORMAT)

### 우선순위
- **반드시**: A, B, C (postview + Compound 루프 핵심 검증)
- **권장**: D (cron 확장 실제 적용 확인)
- **주간 1회**: E, F (정상 운영 확인)

---

## ✅ Phase v4-4 (사용자 UI 노출) — 구현 완료 (2026-04-16~17)

전체 항목 구현 완료. 운영/검증은 자연 발화 관찰 섹션으로 이관.

- ✅ `/analysis/game/[id]` 페이지 — 홈/원정 에이전트 박스 + 심판 reasoning + factor 분해
- ✅ `/analysis` 인덱스 + 시즌 AI 리더보드 (`/dashboard` 이전)
- ✅ 빅매치 자동 선정 휴리스틱 — `packages/kbo-data/src/big-match/selectBigMatch.ts`
- ✅ `BigMatchDebateCard.tsx` hero 섹션 컴포넌트
- ✅ A/B flag — `apps/moneyball/src/lib/feature-flags.ts isBigMatchEnabled`
- ✅ `/debug/hallucination` 대시보드 + middleware BASIC auth (validator 로그)
- ✅ `docs/defamation-ir.md` 명예훼손 IR 절차 문서

남은 검증 (자연 발화):
- post_game 데이터 UI 렌더링 — Phase v4-3 자연 발화 관찰 섹션 A,B,C 항목으로 검증
- 빅매치 자동 선정 결과 의미 있는지 — 운영 데이터 축적 후 후속 회고

---

## 🛠 v0.5.18-21 후속 운영 (2026-04-19)

### Sentry 모니터링 정기 점검
- **What**: Sentry Issues 탭 주 1회 점검. 같은 에러 패턴 반복 시 fix.
- **Where**: https://sentry.io 본인 계정, 프로젝트 `moneyballscore`
- **When**: 주말 retro 시 함께
- **Free plan 한도**: 월 5K errors. 80% 도달 시 이메일 알림 자동.

### Migration 012 적용 검증
- **Done**: `supabase migration list --linked` — 001~012 모두 동기화 완료 (2026-04-19).
- 남은 검증: prod에서 `/search` 한글 선수 ILIKE 응답 시간이 빠른지 (수동 1회).

### 사용자 리텐션 기능 — 부분 구현 진행도
- ✅ 관심 팀 필터 (`FavoriteTeamFilter.tsx`) — localStorage 기반
- ✅ RSS feed (`/feed`) — 이전 구현
- ⏸ 북마크 (특정 경기 팔로우)
- ⏸ 결과 알림 (이메일/푸시)
- ⏸ 사용자 계정 / 세션
- 우선순위: LOW (트래픽 발생 후 재평가)

---

## ✅ v4-4 후속 — 30일 retention (완료)

- **구현**: `daily.ts` predict 모드 시작 시 `agent_memories` + `validator_logs` 30일 초과 row 자동 삭제
- **pg_cron 불필요**: 기존 daily-pipeline cron이 매일 실행하므로 별도 DB extension 없이 해결

## ✅ v5 이후 deferred — DESIGN.md 작성 (완료)

- DESIGN.md 작성 완료 (2026-04-16, `/design-consultation` 실행).
- 다크 그린 + 골드 팔레트 + Pretendard 타이포 + 8px 스페이싱 시스템 + Decisions Log 포함.

---

## Phase 2a 시작 전

### ~~Statiz 스크래핑 법적 리스크 확인~~ ✓ 완료 (2026-04-14)
- **결과:** statiz.co.kr robots.txt에서 `User-agent: * / Disallow: /` — 전체 차단
- **대안 확정:** 3소스 조합
  - KBO 공식 (koreabaseball.com): 경기일정, 선발확정, 결과, 최근폼, 상대전적
  - KBO Fancy Stats (kbofancystats.com): FIP, xFIP, WAR, wOBA, SFR, Elo (robots.txt 없음)
  - FanGraphs (fangraphs.com): wRC+, ISO, BB%/K% (보조/검증)

## KBO Daily 개발 전

### 애드센스 승인 요건 조사
- **What:** Google AdSense 승인에 필요한 최소 요건 조사
- **Why:** AI 생성 콘텐츠에 대한 구글 최신 정책, 최소 콘텐츠 수, 승인 소요 시간 파악
- **확인 사항:** AI 콘텐츠 허용 범위, 자체 도메인 요건, 트래픽 최소 기준
- **우선순위:** HIGH (KBO Daily 개발 방향에 영향)

