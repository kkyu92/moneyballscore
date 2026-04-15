-- ============================================
-- Phase v4-2: 에이전트 토론 메타데이터
-- ============================================
-- debate_version: 토론 프롬프트 버전 (A/B 비교·재현 용)
--   'v1-narrative' = Phase C/D 원래 TEAM_PROFILES 내러티브 (DEFAULT)
--   'v2-persona4'  = Phase v4-2 데이터 역할 중심 페르소나
-- scoring_rule:  정량 모델 가중치 버전 (factors JSONB와 함께 재계산 가능케 함)
--   'v1.5' = 현행 10팩터
--   'v2.0' = 추후 업그레이드 예정

ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS debate_version VARCHAR(20) DEFAULT 'v1-narrative';

ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS scoring_rule VARCHAR(20);

COMMENT ON COLUMN predictions.debate_version IS
  '에이전트 토론 프롬프트 버전. v1-narrative | v2-persona4 등. A/B 비교용.';

COMMENT ON COLUMN predictions.scoring_rule IS
  '정량 모델 가중치 버전. v1.5 | v2.0 등. factors JSONB와 함께 재계산 가능.';

-- 주의: 기존 row UPDATE 없음 (Q3 결정: DEFAULT만 적용)
-- 기존 Phase C/D 내러티브 토론 row는 debate_version=NULL 유지
-- 신규 예측부터 daily.ts에서 'v2-persona4' 명시 저장
