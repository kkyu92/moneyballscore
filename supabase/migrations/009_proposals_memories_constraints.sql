-- Phase v4-3 Task 5
-- agent_memories 읽기 경로 강화 + proposals 스키마 신설
--
-- 순서 엄격 (eng-review A5 반영):
--   1. TRUNCATE (기존 중복 row 제거) — UNIQUE 제약 먼저 걸면 실패 가능
--   2. ADD UNIQUE (team_code, memory_type, content) — 중복 방지
--   3. CREATE INDEX (team_code, valid_until, confidence) — rivalry-memory 읽기 쿼리 커버
--   4. CREATE TABLE proposals — 가중치 튜닝 제안 스키마 (v4-3은 스키마만, 백테스트 v5)

-- 1. agent_memories 레거시 row 삭제
-- 근거: 읽기 경로가 0곳이라 손실 없음. v4-3 Task 3 개선된 분류 로직으로 재수집.
TRUNCATE TABLE agent_memories;

-- 2. 중복 방지 UNIQUE 제약 (eng-review A3)
-- Task 3의 retro.upsert(onConflict)와 짝. 같은 팀·타입·내용이면 valid_until만 연장.
ALTER TABLE agent_memories
  ADD CONSTRAINT agent_memories_unique_content
  UNIQUE (team_code, memory_type, content);

-- 3. 읽기 경로 인덱스 (eng-review A2)
-- rivalry-memory.ts 쿼리: team_code IN (..) AND valid_until >= date ORDER BY confidence DESC
CREATE INDEX idx_agent_memories_read
  ON agent_memories(team_code, valid_until DESC, confidence DESC)
  WHERE valid_until IS NOT NULL;

-- 4. proposals 테이블 신규 (v5 백테스트 하네스 스키마 준비)
CREATE TABLE proposals (
  id              SERIAL PRIMARY KEY,
  source          VARCHAR(20) NOT NULL,         -- 'postview' | 'retro' | 'manual'
  factor          VARCHAR(30) NOT NULL,         -- 대상 factor 키 (예: home_bullpen_fip)
  delta           DECIMAL(4,3) NOT NULL,        -- 가중치 제안 변화량
  rationale       TEXT,                         -- 왜 이 제안인지
  status          VARCHAR(20) DEFAULT 'pending', -- pending | approved | rejected | applied
  source_game_id  INT REFERENCES games(id),     -- 근거 경기
  created_at      TIMESTAMPTZ DEFAULT now(),
  applied_at      TIMESTAMPTZ
);

CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_factor ON proposals(factor);

-- pgvector 확장·임베딩 컬럼은 v5에서 추가 (유사 제안 검색용). v4-3은 스키마만.

-- RLS: 서비스 롤만 read/write (관리자 전용 자산)
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service insert proposals" ON proposals FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service select proposals" ON proposals FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service update proposals" ON proposals FOR UPDATE
  USING (auth.role() = 'service_role');

COMMENT ON TABLE proposals IS
  'v4-3 Task 5: 가중치 튜닝 제안 저장소 (스키마만). v5에서 자동 백테스트·롤백 하네스 추가 예정.';

COMMENT ON CONSTRAINT agent_memories_unique_content ON agent_memories IS
  'v4-3 Task 5: 동일 (team, type, content) 중복 방지. retro.upsert onConflict와 짝.';

COMMENT ON INDEX idx_agent_memories_read IS
  'v4-3 Task 5: rivalry-memory.ts 읽기 쿼리 커버 (team_code + valid_until + confidence 정렬)';
