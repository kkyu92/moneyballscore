-- ============================================
-- 리그 시드 데이터
-- ============================================
INSERT INTO leagues (code, name_ko, name_en, sport, country, timezone, api_source, is_active) VALUES
  ('KBO', 'KBO 프로야구',   'Korean Baseball Organization', 'baseball', 'KR', 'Asia/Seoul',       'statiz',        true),
  ('MLB', '메이저리그',      'Major League Baseball',        'baseball', 'US', 'America/New_York', 'mlb_stats_api', false),
  ('NBA', 'NBA',            'National Basketball Association','basketball','US','America/New_York', 'nba_stats',     false),
  ('NPB', '일본프로야구',    'Nippon Professional Baseball',  'baseball', 'JP', 'Asia/Tokyo',       'npb_scrape',    false);

-- ============================================
-- KBO 10개 팀 시드 데이터
-- ============================================
INSERT INTO teams (league_id, code, name_ko, name_en, color_primary, stadium) VALUES
  ((SELECT id FROM leagues WHERE code = 'KBO'), 'SSG', 'SSG 랜더스',     'SSG Landers',    '#CE0E2D', '인천SSG랜더스필드'),
  ((SELECT id FROM leagues WHERE code = 'KBO'), 'KIA', 'KIA 타이거즈',   'KIA Tigers',     '#EA0029', '광주-기아 챔피언스 필드'),
  ((SELECT id FROM leagues WHERE code = 'KBO'), 'LGT', 'LG 트윈스',      'LG Twins',       '#C30452', '서울종합운동장 야구장'),
  ((SELECT id FROM leagues WHERE code = 'KBO'), 'DSB', '두산 베어스',     'Doosan Bears',   '#131230', '서울종합운동장 야구장'),
  ((SELECT id FROM leagues WHERE code = 'KBO'), 'KTW', 'KT 위즈',        'KT Wiz',         '#000000', '수원KT위즈파크'),
  ((SELECT id FROM leagues WHERE code = 'KBO'), 'SSA', '삼성 라이온즈',   'Samsung Lions',  '#074CA1', '대구삼성라이온즈파크'),
  ((SELECT id FROM leagues WHERE code = 'KBO'), 'LOT', '롯데 자이언츠',   'Lotte Giants',   '#002B5C', '부산사직야구장'),
  ((SELECT id FROM leagues WHERE code = 'KBO'), 'HHE', '한화 이글스',     'Hanwha Eagles',  '#FF6600', '대전한화생명이글스파크'),
  ((SELECT id FROM leagues WHERE code = 'KBO'), 'NCB', 'NC 다이노스',     'NC Dinos',       '#315288', '창원NC파크'),
  ((SELECT id FROM leagues WHERE code = 'KBO'), 'KIW', '키움 히어로즈',   'Kiwoom Heroes',  '#570514', '서울고척스카이돔');

-- 초기 모델 가중치 v1.0 (KBO용)
INSERT INTO model_weights (league_id, version, weights, is_active, notes) VALUES
  ((SELECT id FROM leagues WHERE code = 'KBO'), 'v1.0', '{
    "sp_fip": 0.25,
    "lineup_woba": 0.20,
    "bullpen_fip": 0.15,
    "recent_form": 0.15,
    "war": 0.10,
    "head_to_head": 0.08,
    "park_factor": 0.07
  }', true, '초기 모델. 7팩터 가중합산 + 홈 어드밴티지 3%');
