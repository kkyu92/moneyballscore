# Moneyball Score — Cloudflare Cron Worker

GitHub Actions schedule 의 high-load skip 문제 해결 + SP 확정 시각 측정 인프라.

## 역할

1. **Phase 1** — daily-pipeline cron trigger (GH Actions schedule 대체)
2. **Phase 2** — SP 확정 시각 측정 로깅 (`sp_confirmation_log` 적재)

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
```

`PIPELINE_URL`, `SUPABASE_URL` 은 `wrangler.toml` 의 `[vars]` 에 평문으로 박혀 있음 (공개되어도 무방).

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

1주~2주 운영 후:

```sql
-- 게임별 SP 양쪽 모두 확정된 첫 시각 (KST)
SELECT
  game_date,
  external_game_id,
  game_time,
  MIN(observed_at AT TIME ZONE 'Asia/Seoul') FILTER (
    WHERE home_sp_name IS NOT NULL AND away_sp_name IS NOT NULL
  ) AS sp_confirmed_kst
FROM sp_confirmation_log
WHERE game_date >= current_date - INTERVAL '14 days'
GROUP BY 1, 2, 3
ORDER BY 1, 3;

-- 게임 시작 시각 별 SP 확정 lead time (분)
SELECT
  game_time,
  COUNT(*) AS games,
  ROUND(AVG(EXTRACT(EPOCH FROM (
    (game_date::timestamp + game_time::time) -
    (MIN(observed_at) FILTER (WHERE home_sp_name IS NOT NULL AND away_sp_name IS NOT NULL))
  )) / 60)::numeric, 0) AS avg_lead_min
FROM sp_confirmation_log
WHERE game_date >= current_date - INTERVAL '14 days'
GROUP BY 1, external_game_id;
```

이 분석 결과 → cron 횟수 정밀 축소 (예: 일 15회 → 5~6회).
