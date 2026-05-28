# Retention metric tracking — carry-over plan (cycle 1021)

**Status**: carry-over (Team plan 안 fire scope)
**Created**: 2026-05-29 cycle 1021 후속
**Priority**: medium (Vercel Analytics + SpeedInsights 이미 baseline 박제)

## 현 baseline

- **Vercel Analytics** (`@vercel/analytics/next`) — layout.tsx 통합. DAU/WAU/page view 자동 측정 (Vercel dashboard 안 가시)
- **SpeedInsights** (`@vercel/speed-insights/next`) — Core Web Vitals 자동

## 추가 자체 layer 의도 (carry-over scope)

Vercel dashboard = 외부 UI. 사용자 가시 페이지 안 노출 X. 본 자체 layer:

1. **visitor_id cookie** — Server-side first-party cookie (1-year persistence)
2. **/api/track POST endpoint** — { path, visitor_id, ts } → supabase visitor_sessions
3. **supabase migration: visitor_sessions table**
   ```sql
   CREATE TABLE visitor_sessions (
     id BIGSERIAL PRIMARY KEY,
     visitor_id TEXT NOT NULL,
     path TEXT NOT NULL,
     visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     user_agent TEXT,
     referrer TEXT
   );
   CREATE INDEX idx_visitor_sessions_visitor ON visitor_sessions (visitor_id);
   CREATE INDEX idx_visitor_sessions_visited ON visitor_sessions (visited_at DESC);
   ```
4. **client-side tracker** — layout.tsx 안 PageView 자동 send
5. **dashboard route** — `/admin/retention` 안 DAU/WAU/재방문률 query + display

## ROI 분석

- (+) data-driven 결정 evidence (cohort analysis / funnel / retention)
- (+) data sovereignty (Vercel paid plan 의존 X)
- (-) Vercel Analytics 이미 baseline 박제 = duplicate layer
- (-) sp_log 안 server-side metric 부재 (별도 layer)

## 결정 trigger

다음 중 1건 충족 시 fire:
- Vercel Analytics paid plan 비용 / 한도 초과
- cohort analysis / funnel 필요 (data sovereignty 의무)
- AdSense 심사 통과 후 광고 retention 측정 의무

## carry-over to Team plan

Team plan 안 fire scope (5 PR 예상):
1. supabase migration: visitor_sessions table
2. /api/track POST endpoint
3. client-side tracker (layout.tsx 통합)
4. visitor_id cookie middleware
5. /admin/retention dashboard route

각 작업 = 작-중간 scope = Team plan 안 본 메인 자율 fire 가능.

## 참조

- cycle 1021 사용자 가시 KBO 강화 작업 list-up (a~d 13건)
- Vercel Analytics: <https://vercel.com/docs/analytics>
