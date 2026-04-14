-- ============================================
-- Phase D: 에이전트 메모리 + Confidence Calibration
-- ============================================

-- 팀 에이전트 메모리 (경기 결과에서 학습한 패턴)
CREATE TABLE agent_memories (
  id            SERIAL PRIMARY KEY,
  team_code     VARCHAR(5) NOT NULL,        -- 팀 코드
  memory_type   VARCHAR(20) NOT NULL,        -- 'strength' | 'weakness' | 'pattern' | 'matchup'
  content       TEXT NOT NULL,               -- 학습한 내용
  confidence    DECIMAL(3,2) DEFAULT 0.5,    -- 이 메모리의 신뢰도 (0-1)
  source_game_id INT REFERENCES games(id),   -- 근거 경기
  valid_until   DATE,                        -- 유효기간 (null이면 시즌 끝까지)
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_memories_team ON agent_memories(team_code, memory_type);

-- Confidence Calibration (3버킷)
CREATE TABLE calibration_buckets (
  id            SERIAL PRIMARY KEY,
  bucket        VARCHAR(10) NOT NULL,        -- 'low' | 'mid' | 'high'
  min_confidence DECIMAL(3,2) NOT NULL,
  max_confidence DECIMAL(3,2) NOT NULL,
  total_predictions INT DEFAULT 0,
  correct_predictions INT DEFAULT 0,
  actual_accuracy DECIMAL(4,3),
  season        INT NOT NULL,
  last_updated  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bucket, season)
);

-- 초기 버킷 (2026 시즌)
INSERT INTO calibration_buckets (bucket, min_confidence, max_confidence, season)
VALUES
  ('low', 0.00, 0.60, 2026),
  ('mid', 0.60, 0.75, 2026),
  ('high', 0.75, 1.00, 2026);

-- RLS
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read agent_memories" ON agent_memories FOR SELECT USING (true);
CREATE POLICY "Service insert agent_memories" ON agent_memories FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update agent_memories" ON agent_memories FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE calibration_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read calibration" ON calibration_buckets FOR SELECT USING (true);
CREATE POLICY "Service insert calibration" ON calibration_buckets FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update calibration" ON calibration_buckets FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
