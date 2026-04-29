# Moneyball Score — Cloudflare Cron Worker

GitHub Actions schedule 의 high-load skip 문제 해결 + SP 확정 시각 측정 +
sitemap warmup + live-update + self-develop 통합 인프라.

## 역할

1. **Phase 1** — daily-pipeline cron trigger (GH Actions schedule 대체)
2. **Phase 2** — SP 확정 시각 측정 로깅 (`sp_confirmation_log` 이중 소스 적재).
   매 trigger 마다 KBO 공식 + Naver 양쪽 호출 → `source='kbo-official'` /
   `source='naver'` 양쪽 row 동시 INSERT. 두 소스 비교로 어느 쪽이 먼저 SP
   채우는지 정량 측정.
3. **Backlog 이관** (4/29) — sitemap-warmup (`37 * * * *`) + live-update
   (`*/10 9-15 * * *`) GH→Cloudflare 이관.
4. **Phase 5a agent-loop** (4/29) — daily fire (`0 0 * * *` = KST 09:00)
   가 GitHub `self-develop.yml` workflow_dispatch. self-hosted [home] runner
   위 claude-code-action 이 진단/결정/실행. 4 prefix (lesson/policy/feedback/
   memory) commit 자동으로 `submit-lesson.yml` dispatch → 허브 auto-ingest
   양방향 흡수. 비용 $0 (CLAUDE_CODE_OAUTH_TOKEN 구독).

   **Phase 5 비전 1 보완 (4/29 ship)**:
   - **namespace 분리** — 사용자 직접 작업과 agent-loop 자동 결과 분리.
     모든 자동 결과는 label `agent-loop` + branch prefix `agent-loop/`.
   - **carry-over chain** — 1 cycle = 10 fire. 큰 task 자율 분해 + GH Issue
     기반 인계 (label `agent-loop,handoff`). 10 fire 도달 시 횡단 lesson
     박제 → cycle 종료 → 다음 daily fire 가 새 cycle 시작.
   - **6 cycles 디버그 경험**: pnpm 충돌 (drift case 3 재발) → bypassPermissions
     → show_full_output → --dangerously-skip-permissions → settings toggle
     (PR 생성 권한). carry-over 패턴 부재로 main 직접 5 push 발생 — 본 비전
     1 보완 후 자연 chain 가능.

## 1회 셋업

### 1) 의존성 설치

```bash
cd cloudflare-worker
pnpm install
```

(turborepo 워크스페이스에 포함되지 않음. 단독 디렉토리.)

### 2) Cloudflare 계정 + wrangler 로그인

```bash
npx wrangler login
```

브라우저 인증 후 토큰 저장. 무료 Workers Free Plan 으로 충분 (100k req/day).

### 3) Secrets 등록

```bash
npx wrangler secret put CRON_SECRET
# 프롬프트에 Vercel 환경변수와 동일한 CRON_SECRET 입력

npx wrangler secret put SUPABASE_SERVICE_KEY
# 프롬프트에 SUPABASE_SERVICE_ROLE_KEY 입력

npx wrangler secret put GH_DISPATCH_PAT
# self-develop daily dispatch 용. PLAYBOOK_PAT 와 동일 토큰 재사용 가능
# (scope = actions:write 필요). github settings → developer settings →
# personal access tokens (classic) 또는 fine-grained → Actions: Read+Write.
```

`PIPELINE_URL`, `SITE_URL`, `SUPABASE_URL`, `GH_REPO` 는 `wrangler.toml` 의
`[vars]` 에 평문으로 박혀 있음 (공개되어도 무방).

### 3-1) GitHub repo secrets (self-develop 용)

```
gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo kkyu92/moneyballscore
# Claude 구독 OAuth 토큰. blog-autopilot 에서 재사용 가능. ANTHROPIC_API_KEY 추가 X.
```

### 3-2) Self-hosted runner [home] 등록

머니볼 repo 가 Personal account 라 org-level runner 공유 불가 → 같은 머신에 별도 디렉토리:

```bash
mkdir ~/actions-runner-moneyball && cd ~/actions-runner-moneyball
# https://github.com/kkyu92/moneyballscore/settings/actions/runners
# → "New self-hosted runner" → macOS ARM64 → 표시된 token 카피 후:
./config.sh --url https://github.com/kkyu92/moneyballscore \
  --token <TOKEN> --labels home --name home-mbp-moneyball
./svc.sh install && ./svc.sh start  # launchd 자동 등록
```

### 4) 배포

```bash
pnpm deploy
```

Cloudflare 대시보드에서 cron triggers 활성화 확인.

### 5) 헬스체크

```bash
curl https://moneyballscore-cron.<your-subdomain>.workers.dev/health
# {"ok":true,"ts":"2026-04-27T..."}
```

### 6) GH Actions schedule 비활성화

`.github/workflows/daily-pipeline.yml` 의 `on.schedule` 블록을 주석 처리. workflow_dispatch 만 남김.

## 운영

### 실시간 로그

```bash
npx wrangler tail
```

### 수동 trigger (디버그)

```bash
curl -X POST https://moneyballscore-cron.<sub>.workers.dev/sp-log \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Cron 시각 확인

`wrangler.toml` `[triggers].crons` — 현재 GH Actions 와 동일하게 `:17` 분.
Cloudflare 는 분 영향 적어서 분 0 으로 단순화 가능.

## 데이터 수집 분석 (Phase 3 진입 신호)

1주~2주 운영 후 아래 SQL 실행. 5문항을 정량적으로 답하기 위함.

### Q1. 게임별 SP 양쪽 확정 시각 (source 별 분리)

```sql
SELECT
  game_date,
  external_game_id,
  game_time,
  source,
  MIN(observed_at AT TIME ZONE 'Asia/Seoul') FILTER (
    WHERE home_sp_name IS NOT NULL AND away_sp_name IS NOT NULL
  ) AS sp_confirmed_kst
FROM sp_confirmation_log
WHERE game_date >= current_date - INTERVAL '14 days'
GROUP BY 1, 2, 3, 4
ORDER BY 1, 3, 4;
```

### Q2. KBO 공식 vs Naver — 어느 쪽이 먼저 SP 채우나 (핵심)

```sql
WITH first_seen AS (
  SELECT
    external_game_id,
    source,
    MIN(observed_at) FILTER (
      WHERE home_sp_name IS NOT NULL AND away_sp_name IS NOT NULL
    ) AS first_confirmed_at
  FROM sp_confirmation_log
  WHERE game_date >= current_date - INTERVAL '14 days'
  GROUP BY 1, 2
),
pivot AS (
  SELECT
    external_game_id,
    MAX(CASE WHEN source = 'kbo-official' THEN first_confirmed_at END) AS kbo_at,
    MAX(CASE WHEN source = 'naver' THEN first_confirmed_at END) AS naver_at
  FROM first_seen
  GROUP BY 1
)
SELECT
  external_game_id,
  kbo_at,
  naver_at,
  EXTRACT(EPOCH FROM (kbo_at - naver_at)) / 60 AS naver_leads_min,
  CASE
    WHEN kbo_at IS NULL THEN 'naver_only'
    WHEN naver_at IS NULL THEN 'kbo_only'
    WHEN naver_at < kbo_at THEN 'naver_first'
    WHEN kbo_at < naver_at THEN 'kbo_first'
    ELSE 'tied'
  END AS winner
FROM pivot
WHERE kbo_at IS NOT NULL OR naver_at IS NOT NULL
ORDER BY external_game_id;
```

### Q3. 어느 쪽이 단독으로 채운 케이스 분포 (redundancy 가치 검증)

```sql
SELECT
  CASE
    WHEN kbo_at IS NULL THEN 'naver_only'
    WHEN naver_at IS NULL THEN 'kbo_only'
    WHEN naver_at < kbo_at THEN 'naver_first'
    WHEN kbo_at < naver_at THEN 'kbo_first'
    ELSE 'tied'
  END AS bucket,
  COUNT(*) AS games
FROM (
  -- (Q2 의 pivot CTE 와 동일 — 실행 시 Q2 SQL 의 WITH 블록 통째 prepend)
  SELECT external_game_id,
    MAX(CASE WHEN source = 'kbo-official' THEN MIN(observed_at) FILTER (
      WHERE home_sp_name IS NOT NULL AND away_sp_name IS NOT NULL) END) AS kbo_at,
    MAX(CASE WHEN source = 'naver' THEN MIN(observed_at) FILTER (
      WHERE home_sp_name IS NOT NULL AND away_sp_name IS NOT NULL) END) AS naver_at
  FROM sp_confirmation_log
  WHERE game_date >= current_date - INTERVAL '14 days'
  GROUP BY 1
) p
GROUP BY 1
ORDER BY games DESC;
```

### Q4. 게임 시작 시각 별 SP 확정 lead time (분, source 통합)

```sql
WITH per_game AS (
  SELECT
    external_game_id,
    game_time,
    MIN(observed_at) FILTER (
      WHERE home_sp_name IS NOT NULL AND away_sp_name IS NOT NULL
    ) AS first_confirmed_at,
    MIN(game_date::timestamp + game_time::time AT TIME ZONE 'Asia/Seoul') AS game_start_utc
  FROM sp_confirmation_log
  WHERE game_date >= current_date - INTERVAL '14 days'
    AND game_time IS NOT NULL
  GROUP BY 1, 2, game_date
)
SELECT
  game_time,
  COUNT(*) AS games,
  ROUND(AVG(EXTRACT(EPOCH FROM (game_start_utc - first_confirmed_at)) / 60)::numeric, 0) AS avg_lead_min,
  ROUND(MIN(EXTRACT(EPOCH FROM (game_start_utc - first_confirmed_at)) / 60)::numeric, 0) AS min_lead_min,
  ROUND(MAX(EXTRACT(EPOCH FROM (game_start_utc - first_confirmed_at)) / 60)::numeric, 0) AS max_lead_min
FROM per_game
WHERE first_confirmed_at IS NOT NULL
GROUP BY 1
ORDER BY 1;
```

### Q5. SP 변경 사례 (KBO 가 등록 후 바꾸는 패턴)

```sql
-- 동일 game/source 안에서 SP 이름이 바뀐 row 가 있는지
SELECT
  source,
  external_game_id,
  COUNT(DISTINCT home_sp_name) AS distinct_home,
  COUNT(DISTINCT away_sp_name) AS distinct_away,
  array_agg(DISTINCT home_sp_name) AS home_history,
  array_agg(DISTINCT away_sp_name) AS away_history
FROM sp_confirmation_log
WHERE game_date >= current_date - INTERVAL '14 days'
  AND home_sp_name IS NOT NULL
GROUP BY 1, 2
HAVING COUNT(DISTINCT home_sp_name) > 1 OR COUNT(DISTINCT away_sp_name) > 1
ORDER BY 2;
```

### Phase 3 결정 기준

이 5개 결과로 답할 것:
- **Naver fallback 가치**: Q3 의 `naver_only` / `naver_first` 가 5% 이상이면 도입. 1% 미만이면 그냥 redundancy 만 남기고 종료.
- **Cron 횟수**: Q4 의 min_lead_min 분포로 안전 마진 결정. 예) 모든 게임이 시작 90분 전 확정 → 시작 2시간 전 1회 + 1시간 전 1회 = 2회면 충분.
- **변동성**: Q5 결과 0건 → SP 변경 없음 (한 번 잡으면 됨). 양수 → 재polling 필요 시점 분석.
