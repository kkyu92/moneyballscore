-- ============================================
-- 팀 코드를 KBO 공식 API 코드로 변경
-- ============================================

UPDATE teams SET code = 'SK' WHERE code = 'SSG';
UPDATE teams SET code = 'HT' WHERE code = 'KIA';
UPDATE teams SET code = 'OB' WHERE code = 'DSB';
UPDATE teams SET code = 'SS' WHERE code = 'SSA';
UPDATE teams SET code = 'LT' WHERE code = 'LOT';
UPDATE teams SET code = 'HH' WHERE code = 'HHE';
UPDATE teams SET code = 'WO' WHERE code = 'KIW';
-- LG, KT, NC는 이미 동일
