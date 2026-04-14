-- ============================================
-- MoneyBall 스포츠 승부예측 - 초기 스키마
-- 멀티 리그 지원 (KBO, MLB, NBA, EPL 등)
-- ============================================

-- 리그 마스터
CREATE TABLE leagues (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(10) UNIQUE NOT NULL,   -- 'KBO','MLB','NBA','EPL'
  name_ko       VARCHAR(50) NOT NULL,          -- 'KBO 프로야구'
  name_en       VARCHAR(50) NOT NULL,          -- 'Korean Baseball Organization'
  sport         VARCHAR(20) NOT NULL,          -- 'baseball','basketball','soccer'
  country       VARCHAR(20) NOT NULL,          -- 'KR','US','UK'
  timezone      VARCHAR(30) NOT NULL,          -- 'Asia/Seoul','America/New_York'
  api_source    VARCHAR(30),                   -- 'statiz','mlb_stats_api','nba_stats'
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 팀 마스터
CREATE TABLE teams (
  id            SERIAL PRIMARY KEY,
  league_id     INT REFERENCES leagues(id),
  code          VARCHAR(5) NOT NULL,
  name_ko       VARCHAR(50) NOT NULL,
  name_en       VARCHAR(50),
  logo_url      TEXT,
  color_primary VARCHAR(7),
  stadium       VARCHAR(80),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(league_id, code)
);

-- 선수 마스터
CREATE TABLE players (
  id            SERIAL PRIMARY KEY,
  league_id     INT REFERENCES leagues(id),
  external_id   VARCHAR(20),                   -- statiz_id, mlb_id 등 리그별 외부 ID
  name_ko       VARCHAR(50) NOT NULL,
  team_id       INT REFERENCES teams(id),
  position      VARCHAR(5),
  throws        VARCHAR(1),
  bats          VARCHAR(1),
  birth_date    DATE,
  is_active     BOOLEAN DEFAULT true,
  name_en       VARCHAR(50),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(league_id, external_id)
);

-- 투수 시즌 스탯
CREATE TABLE pitcher_stats (
  id            SERIAL PRIMARY KEY,
  player_id     INT REFERENCES players(id),
  season        INT NOT NULL,
  games         INT DEFAULT 0,
  innings       DECIMAL(5,1) DEFAULT 0,
  wins          INT DEFAULT 0,
  losses        INT DEFAULT 0,
  era           DECIMAL(5,2),
  fip           DECIMAL(5,2),
  whip          DECIMAL(5,3),
  k_per_9       DECIMAL(5,2),
  bb_per_9      DECIMAL(5,2),
  hr_per_9      DECIMAL(5,2),
  war           DECIMAL(5,2),
  lob_pct       DECIMAL(5,3),
  gb_pct        DECIMAL(5,3),
  hard_hit_pct  DECIMAL(5,3),
  last_synced   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, season)
);

-- 타자 시즌 스탯
CREATE TABLE batter_stats (
  id            SERIAL PRIMARY KEY,
  player_id     INT REFERENCES players(id),
  season        INT NOT NULL,
  games         INT DEFAULT 0,
  pa            INT DEFAULT 0,
  ab            INT DEFAULT 0,
  hits          INT DEFAULT 0,
  hr            INT DEFAULT 0,
  rbi           INT DEFAULT 0,
  sb            INT DEFAULT 0,
  avg           DECIMAL(4,3),
  obp           DECIMAL(4,3),
  slg           DECIMAL(4,3),
  ops           DECIMAL(4,3),
  woba          DECIMAL(4,3),
  wrc_plus      INT,
  war           DECIMAL(5,2),
  bb_pct        DECIMAL(5,3),
  k_pct         DECIMAL(5,3),
  hard_hit_pct  DECIMAL(5,3),
  last_synced   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, season)
);

-- 경기 일정 + 결과
CREATE TABLE games (
  id            SERIAL PRIMARY KEY,
  league_id     INT REFERENCES leagues(id),
  game_date     DATE NOT NULL,
  game_time     TIME,
  home_team_id  INT REFERENCES teams(id),
  away_team_id  INT REFERENCES teams(id),
  stadium       VARCHAR(80),
  home_sp_id    INT REFERENCES players(id),
  away_sp_id    INT REFERENCES players(id),
  status        VARCHAR(10) DEFAULT 'scheduled',
  home_score    INT,
  away_score    INT,
  winner_team_id INT REFERENCES teams(id),
  is_canceled   BOOLEAN DEFAULT false,
  external_game_id VARCHAR(20),                -- KBO/MLB 등 리그별 경기 ID
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 승부예측
CREATE TABLE predictions (
  id              SERIAL PRIMARY KEY,
  game_id         INT REFERENCES games(id) UNIQUE,
  predicted_winner INT REFERENCES teams(id),
  confidence      DECIMAL(4,3),
  predicted_score_home INT,
  predicted_score_away INT,
  home_sp_fip     DECIMAL(5,2),
  away_sp_fip     DECIMAL(5,2),
  home_lineup_woba DECIMAL(4,3),
  away_lineup_woba DECIMAL(4,3),
  home_bullpen_fip DECIMAL(5,2),
  away_bullpen_fip DECIMAL(5,2),
  home_war_total   DECIMAL(5,2),
  away_war_total   DECIMAL(5,2),
  home_recent_form  DECIMAL(4,3),
  away_recent_form  DECIMAL(4,3),
  head_to_head_rate DECIMAL(4,3),
  park_factor       DECIMAL(4,3),
  is_correct      BOOLEAN,
  actual_winner   INT REFERENCES teams(id),
  model_version   VARCHAR(10) DEFAULT 'v1.0',
  reasoning       JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  verified_at     TIMESTAMPTZ
);

-- 블로그 포스트
CREATE TABLE posts (
  id            SERIAL PRIMARY KEY,
  league_id     INT REFERENCES leagues(id),
  slug          VARCHAR(100) UNIQUE NOT NULL,
  post_type     VARCHAR(10) NOT NULL,
  title         VARCHAR(200) NOT NULL,
  subtitle      VARCHAR(300),
  content       TEXT NOT NULL,
  excerpt       VARCHAR(500),
  game_date     DATE,
  game_ids      INT[],
  meta_title    VARCHAR(70),
  meta_desc     VARCHAR(160),
  og_image_url  TEXT,
  keywords      TEXT[],
  status        VARCHAR(10) DEFAULT 'draft',
  published_at  TIMESTAMPTZ,
  view_count    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 적중률 트래킹
CREATE TABLE accuracy_tracking (
  id            SERIAL PRIMARY KEY,
  league_id     INT REFERENCES leagues(id),
  period_type   VARCHAR(10) NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  total_predictions INT DEFAULT 0,
  correct_predictions INT DEFAULT 0,
  accuracy_rate DECIMAL(4,3),
  avg_confidence DECIMAL(4,3),
  high_conf_accuracy DECIMAL(4,3),
  model_version VARCHAR(10),
  breakdown     JSONB,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period_type, period_start, model_version)
);

-- 모델 가중치 히스토리
CREATE TABLE model_weights (
  id            SERIAL PRIMARY KEY,
  league_id     INT REFERENCES leagues(id),
  version       VARCHAR(10) NOT NULL,
  weights       JSONB NOT NULL,
  performance   JSONB,
  is_active     BOOLEAN DEFAULT false,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX idx_games_league_date ON games(league_id, game_date);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_teams_league ON teams(league_id);
CREATE INDEX idx_players_league ON players(league_id);
CREATE INDEX idx_predictions_game ON predictions(game_id);
CREATE INDEX idx_posts_type_date ON posts(post_type, game_date DESC);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status, published_at DESC);
CREATE INDEX idx_accuracy_period ON accuracy_tracking(period_type, period_start DESC);
CREATE INDEX idx_pitcher_stats_season ON pitcher_stats(player_id, season);
CREATE INDEX idx_batter_stats_season ON batter_stats(player_id, season);

-- ============================================
-- RLS (Row Level Security)
-- 읽기: 공개 / 쓰기: service_role 전용
-- ============================================
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read leagues" ON leagues FOR SELECT USING (true);
CREATE POLICY "Service write leagues" ON leagues FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Service write teams" ON teams FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Service write players" ON players FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE pitcher_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pitcher_stats" ON pitcher_stats FOR SELECT USING (true);
CREATE POLICY "Service write pitcher_stats" ON pitcher_stats FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE batter_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read batter_stats" ON batter_stats FOR SELECT USING (true);
CREATE POLICY "Service write batter_stats" ON batter_stats FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read games" ON games FOR SELECT USING (true);
CREATE POLICY "Service write games" ON games FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Service write predictions" ON predictions FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read posts" ON posts FOR SELECT USING (status = 'published');
CREATE POLICY "Service write posts" ON posts FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE accuracy_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read accuracy" ON accuracy_tracking FOR SELECT USING (true);
CREATE POLICY "Service write accuracy" ON accuracy_tracking FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE model_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read model_weights" ON model_weights FOR SELECT USING (true);
CREATE POLICY "Service write model_weights" ON model_weights FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
