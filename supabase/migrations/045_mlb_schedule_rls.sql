-- 045_mlb_schedule_rls.sql (cycle 2067 fix-incident, 사례 24)
--
-- mlb_schedule (038_mlb_schedule.sql) 는 RLS 활성화 + anon read policy 를 빠뜨림
-- (044_mlb_team_stats.sql 은 같은 패턴을 명시적으로 넣었음 — 038 만 예외).
-- 결과: anon key (앱 서버 컴포넌트가 쓰는 키) 로 SELECT 시 항상 0 rows (에러 없이
-- silent 필터링) — service role key 로만 데이터가 보임. /mlb/matchup, /mlb/team
-- 이 "아직 완료된 경기가 없습니다" 를 항상 렌더한 진짜 근본 원인 — 사례 22(FK gap)
-- 와 사례 23(backfill 부재) 를 둘 다 고쳐도 이 RLS 락이 남아있으면 화면은 계속 빈
-- 상태. service role 스크립트로 "데이터 있음" 을 확인해도 anon 경로가 막혀있으면
-- 무의미 — Artifact-First 진단 원칙 위반 지점(실제 렌더 경로 키로 재검증 안 함).

ALTER TABLE mlb_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read mlb_schedule"
  ON mlb_schedule FOR SELECT
  USING (true);
