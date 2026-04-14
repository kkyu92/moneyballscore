-- ============================================
-- MoneyBall Eng Review 패치
-- 1. RLS 정책 분리 (FOR ALL → 개별 정책)
-- 2. predictions: prediction_type 추가 + UNIQUE 수정
-- 3. games: external_game_id UNIQUE 추가
-- 4. posts 테이블 제거 (콘텐츠는 별도 워커)
-- 5. model_weights 공개 읽기 제거
-- ============================================

-- ============================================
-- 1. RLS 정책 분리
-- FOR ALL → FOR INSERT, FOR UPDATE, FOR DELETE
-- ============================================

-- leagues
DROP POLICY IF EXISTS "Service write leagues" ON leagues;
CREATE POLICY "Service insert leagues" ON leagues FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update leagues" ON leagues FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service delete leagues" ON leagues FOR DELETE
  USING (auth.role() = 'service_role');

-- teams
DROP POLICY IF EXISTS "Service write teams" ON teams;
CREATE POLICY "Service insert teams" ON teams FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update teams" ON teams FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service delete teams" ON teams FOR DELETE
  USING (auth.role() = 'service_role');

-- players
DROP POLICY IF EXISTS "Service write players" ON players;
CREATE POLICY "Service insert players" ON players FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update players" ON players FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service delete players" ON players FOR DELETE
  USING (auth.role() = 'service_role');

-- pitcher_stats
DROP POLICY IF EXISTS "Service write pitcher_stats" ON pitcher_stats;
CREATE POLICY "Service insert pitcher_stats" ON pitcher_stats FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update pitcher_stats" ON pitcher_stats FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service delete pitcher_stats" ON pitcher_stats FOR DELETE
  USING (auth.role() = 'service_role');

-- batter_stats
DROP POLICY IF EXISTS "Service write batter_stats" ON batter_stats;
CREATE POLICY "Service insert batter_stats" ON batter_stats FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update batter_stats" ON batter_stats FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service delete batter_stats" ON batter_stats FOR DELETE
  USING (auth.role() = 'service_role');

-- games
DROP POLICY IF EXISTS "Service write games" ON games;
CREATE POLICY "Service insert games" ON games FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update games" ON games FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service delete games" ON games FOR DELETE
  USING (auth.role() = 'service_role');

-- predictions
DROP POLICY IF EXISTS "Service write predictions" ON predictions;
CREATE POLICY "Service insert predictions" ON predictions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update predictions" ON predictions FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service delete predictions" ON predictions FOR DELETE
  USING (auth.role() = 'service_role');

-- accuracy_tracking
DROP POLICY IF EXISTS "Service write accuracy" ON accuracy_tracking;
CREATE POLICY "Service insert accuracy" ON accuracy_tracking FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update accuracy" ON accuracy_tracking FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service delete accuracy" ON accuracy_tracking FOR DELETE
  USING (auth.role() = 'service_role');

-- model_weights
DROP POLICY IF EXISTS "Service write model_weights" ON model_weights;
CREATE POLICY "Service insert model_weights" ON model_weights FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update model_weights" ON model_weights FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service delete model_weights" ON model_weights FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 2. model_weights 공개 읽기 제거
-- 경쟁자가 예측 모델 가중치를 복제하지 못하도록
-- ============================================
DROP POLICY IF EXISTS "Public read model_weights" ON model_weights;
CREATE POLICY "Service read model_weights" ON model_weights FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================
-- 3. predictions: prediction_type 추가
-- pre_game / in_game / final 구분
-- ============================================
ALTER TABLE predictions ADD COLUMN prediction_type VARCHAR(10) DEFAULT 'pre_game';

-- 기존 UNIQUE 제약 제거 후 새 제약 추가
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_game_id_key;
ALTER TABLE predictions ADD CONSTRAINT predictions_game_type_unique
  UNIQUE(game_id, prediction_type);

-- ============================================
-- 4. games: external_game_id 유니크 제약
-- 스크래핑 upsert 안전성 확보
-- ============================================
ALTER TABLE games ADD CONSTRAINT games_league_external_unique
  UNIQUE(league_id, external_game_id);

-- ============================================
-- 5. posts 테이블 제거
-- MoneyBall은 데이터 엔진 전용
-- 콘텐츠는 KBO Daily (별도 워커)가 담당
-- ============================================
DROP POLICY IF EXISTS "Public read posts" ON posts;
DROP POLICY IF EXISTS "Service write posts" ON posts;
DROP INDEX IF EXISTS idx_posts_type_date;
DROP INDEX IF EXISTS idx_posts_slug;
DROP INDEX IF EXISTS idx_posts_status;
DROP TABLE IF EXISTS posts;
