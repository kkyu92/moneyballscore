-- 051: MLB 확정 선발투수 이름 — mlb_schedule 확장
-- cycle 2457 explore-idea(heavy): statsapi-mlb.ts 의 fetchProbablePitchers 가 이미
-- MLB 확정 선발투수 이름/ID 를 반환하지만(hydrate=probablePitcher), 어떤 pipeline mode 도
-- 이를 소비하지 않아 KBO(analysis/game/[id] wave-335) 대비 완전 미이식 상태였음.
-- 개인 FIP 스탯 소스는 여전히 부재(Tier 3, 별도 스코프) — 이름만 우선 이식.
ALTER TABLE mlb_schedule
  ADD COLUMN IF NOT EXISTS home_starter_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS away_starter_name VARCHAR(100);
