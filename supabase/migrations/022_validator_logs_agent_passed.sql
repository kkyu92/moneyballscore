-- cycle 30 — validator_logs 스키마 확장
-- (1) agent 컬럼: 'team' (TeamArgument 검증) vs 'judge' (JudgeVerdict.reasoning 검증, cycle 27 P1+P2 박제)
-- (2) passed 컬럼: WARN_LIMIT 이하라 통과한 near-miss 도 박제. 시즌 누적 silent drift 사전 감지
--
-- 기존 row 의 agent 는 'team' 으로 자동 박제 (default). passed 는 false (위반 row 만 insert 됐던 운영 path 일치).
-- cycle 27 의 notifyValidationViolations Sentry path 와 별개 — 본 컬럼은 DB 박제 + 대시보드 시각화용.

ALTER TABLE validator_logs
  ADD COLUMN agent VARCHAR(10) NOT NULL DEFAULT 'team',
  ADD COLUMN passed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_validator_logs_agent ON validator_logs(agent, severity);
CREATE INDEX idx_validator_logs_passed ON validator_logs(passed, created_at DESC);

COMMENT ON COLUMN validator_logs.agent IS
  'cycle 30 — team/judge 분리. judge = JudgeVerdict.reasoning 검증 (cycle 27 P1+P2)';
COMMENT ON COLUMN validator_logs.passed IS
  'cycle 30 — near-miss 박제. true=위반 발생했지만 WARN_LIMIT 이하 통과 (silent drift 사전 감지)';
