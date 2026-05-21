-- 028: waitlist table — MLB landing page demand test (plan #1 Step 1)
-- cycle 827 explore-idea (heavy, plan #1): A pivot landing page + waitlist email capture
-- plan #1 = `/mlb` landing page demand verification (30일 < 50 waitlist OR AdSense reject = kill criteria)
-- Phase 2+3 critical gap 6: `mlb_waitlist` → `waitlist` (league column future-proof NPB/CPBL)
-- Phase 2+3 critical gap 2: email enumeration 보호 (duplicate = 동일 200, ON CONFLICT DO NOTHING)
-- Phase 2+3 critical gap 3: RLS service role insert only (cycle 312 /api/picks 정합)
-- Phase 2+3 defense-in-depth: DB CHECK constraint (length + RFC 5322 simplified regex)

CREATE TABLE waitlist (
  id BIGSERIAL PRIMARY KEY,
  league TEXT NOT NULL DEFAULT 'mlb',
  email TEXT NOT NULL CHECK (
    length(email) BETWEEN 5 AND 254
    AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league, email)
);

CREATE INDEX idx_waitlist_league_created ON waitlist(league, created_at DESC);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- 보안 패턴 (plan #1 Phase 2+3 critical gap 3):
-- Anon INSERT denied — API route only via service role
-- Public read denied — leaderboard 류 노출 X (이메일 PII 보호)
-- service role (Supabase NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) 만 직접 INSERT
-- API route 안 rate limit (Vercel KV) + CSRF Origin + honeypot 검증 후 service role insert

COMMENT ON TABLE waitlist IS
  'MLB landing page demand test waitlist (plan #1). league column future-proof NPB/CPBL. RLS service role only.';
COMMENT ON COLUMN waitlist.league IS
  'kbo / mlb / npb / cpbl 등 league code. DEFAULT mlb (plan #1 scope), 신규 league 추가 시 UNIQUE(league,email) 보장';
COMMENT ON COLUMN waitlist.email IS
  'CHECK constraint = length 5-254 + RFC 5322 simplified regex. defense-in-depth (API validate first, DB validate second)';
COMMENT ON COLUMN waitlist.referrer IS
  'HTTP Referer header — 마케팅 attribution 추적 (optional)';
COMMENT ON COLUMN waitlist.user_agent IS
  'HTTP User-Agent — bot detection / 통계 분석 (optional)';
