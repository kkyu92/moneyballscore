-- 015_games_weather.sql
-- games.weather JSONB 컬럼 추가 — 경기별 날씨 스냅샷.
--
-- 배경: 예측 분석 심화 + 날씨 팩터 연구 목적. Open-Meteo Historical API 로
-- 과거 경기 백필 + forward 경기마다 live-update 가 저장. UI (prediction card,
-- mini game card) 는 현재 runtime 페치 중이나, 단일 truth 로 games.weather
-- 참조 전환 가능.
--
-- JSONB 선택 이유: 필드 확장 여지 (습도, 기압 등) 다수. 별도 game_weather
-- 테이블보다 JOIN 비용 없음. 색인은 필요 시 GIN 추가.
--
-- 스키마 예:
--   {
--     "tempC": 18.5,
--     "precipPct": 10,
--     "windSpeedKmh": 12.3,
--     "windDirDeg": 270,
--     "code": 2,
--     "icon": "🌤️",
--     "label": "구름조금",
--     "source": "open-meteo-archive"
--   }
--
-- 돔구장 (고척) 은 외부 기온 참고용. humidity 등은 차후 확장.

ALTER TABLE games ADD COLUMN weather JSONB;

COMMENT ON COLUMN games.weather IS
  '경기 시작 시점 날씨 스냅샷. Open-Meteo Historical (backfill) 또는 Forecast (forward) 소스. 돔구장은 외부 기온 참고용.';
