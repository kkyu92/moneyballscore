-- 040_predictions_home_win_prob_decimal.sql
-- predictions.home_win_prob FLOAT → DECIMAL(4,3) (cycle 1404, issue #2505)
--
-- 038_mlb_schedule.sql 에서 home_win_prob FLOAT 로 박제됐으나
-- KBO 측 predictions.confidence + 다른 확률 컬럼들은 DECIMAL(4,3) 사용.
-- FLOAT (= double precision) 은 정밀도 unbounded — 동일 도메인 (확률 0~1) 에
-- 서로 다른 numeric type 사용 = silent drift family pattern (cycle 1400 P3 정합).
--
-- DECIMAL(4,3) 매핑 = -9.999~9.999 범위 + 3 소수자리. 확률 (0~1) clamp 정합.
-- 기존 row 의 FLOAT 값은 USING cast 로 자동 변환 (소수 3자리 반올림).

ALTER TABLE predictions
  ALTER COLUMN home_win_prob TYPE DECIMAL(4,3)
  USING home_win_prob::DECIMAL(4,3);
