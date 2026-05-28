-- 029_umpire_stats.sql
-- KBO 심판별 strike zone bias 누적 통계 — factor 12 umpire_sz source
--
-- 배경: 2-day blast plan factor 12 신규 추가. 심판 SZ bias 는 시즌 누적이 필요한
-- factor 라 sample_n < 30 시 league-avg fallback (sz_widen_pct=0). sample_n >= 30
-- 도달 시 personalize.
--
-- sz_widen_pct: 음수 = 좁음 (투수 친화) / 양수 = 넓음 (타자 친화) / 0 = neutral
-- 데이터 source: KBO 게임센터 (Score.aspx) 안 심판 4인 표시 + 누적 카운트
--
-- 안전: production 가중치 0 (DEFAULT_WEIGHTS.umpire_sz=0). shadow cohort 에서만
-- weight>0 적용. 본 마이그레이션 자체는 schema 만 박제.

CREATE TABLE IF NOT EXISTS umpire_stats (
  id SERIAL PRIMARY KEY,
  name VARCHAR(10) UNIQUE NOT NULL,
  sz_widen_pct DECIMAL(4, 2) DEFAULT 0,
  sample_n INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_umpire_stats_name ON umpire_stats(name);

COMMENT ON TABLE umpire_stats IS
  'KBO 심판별 strike zone bias 누적 통계 (factor 12 umpire_sz source). sample_n<30 시 league-avg fallback';
COMMENT ON COLUMN umpire_stats.sz_widen_pct IS
  '심판별 strike zone widening percent. 음수=좁음(투수친화), 양수=넓음(타자친화), 0=neutral.';
COMMENT ON COLUMN umpire_stats.sample_n IS
  '누적 표본 수. >=30 시 personalize, <30 시 league-avg fallback.';
