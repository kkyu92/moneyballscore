# 데이터 수집 결손이 모델 가중치를 사문화 (Anti-P2)

**카테고리**: data_pipeline / anti_pattern  
**발견**: cycle 1517 (2026-07-08)

## 문제

예측 파이프라인의 두 팩터(WAR 8%, park_factor 4%)가 항상 중립값(0.5)을 반환.  
모델 가중치 12%가 실질적으로 기여 0인 상태.

```
WAR:         normalize(0, 0, true)  = 0.5  ← total_war = 0.0 전 팀
park_factor: 0.5 + (1.0 - 1) * 2   = 0.5  ← DEFAULT_PARK_FACTORS 키 미스매치 → default 1.0
```

파이프라인은 정상 완료. 예측도 정상 생성. 알림 없음.

## 원인

**WAR 버그**  
- `team_season_stats.total_war = 0.0` — KBO Fancy Stats WAR 스크래퍼가 값을 채우지 못함
- `default: totalWar: 12` (hardcode) 이지만 실제 DB row가 항상 0.0으로 존재
- `normalize(0, 0, true)` → 분자=0, 분모=0 → 0.5 fallback

**park_factor 버그**  
- `games.stadium`: "사직", "잠실", "고척" 등 **단축명** 저장
- `DEFAULT_PARK_FACTORS` 키: "부산사직야구장", "서울종합운동장 야구장" 등 **전체명**
- `DEFAULT_PARK_FACTORS["사직"] === undefined` → `?? 1.0` → `0.5 + 0 = 0.5`

## 해결

### WAR 수정
```typescript
// scrapers/kbo-fancystats.ts — WAR 스크래퍼 점검
// total_war 파싱 실패 시 null 저장 (0.0 아닌 null → pipeline에서 default fallback 명시적 분기)
```

### park_factor 수정 (단축명 → 전체명 매핑 추가)
```typescript
// scrapers/kbo-official.ts
const STADIUM_SHORT_TO_FULL: Record<string, string> = {
  '사직': '부산사직야구장',
  '잠실': '서울종합운동장 야구장',
  '고척': '서울고척스카이돔',
  '광주': '광주-기아 챔피언스 필드',
  '대구': '대구삼성라이온즈파크',
  '수원': '수원KT위즈파크',
  '대전': '대전한화생명이글스파크',
  '창원': '창원NC파크',
  '문학': '인천SSG랜더스필드',
};

// daily.ts
const fullName = STADIUM_SHORT_TO_FULL[game.stadium] ?? game.stadium;
parkFactor: DEFAULT_PARK_FACTORS[fullName] ?? 1.0,
```

### 탐지 레이어 추가
```typescript
// 데이터 수집 검증 — pipeline 완료 후 실행
if (allTeams.every(t => t.totalWar === 0)) {
  captureMessage('WAR 데이터 수집 실패 — total_war=0 전 팀', { level: 'warning' });
}
```

## 교훈

1. **fallback이 항상 neutral값이면 가중치가 사문화된다**  
   - `normalize(x, x) = 0.5` → 완벽한 중립 → 가중치 기여 0
   - "파이프라인 정상 완료"는 "데이터 수집 성공"을 의미하지 않음

2. **factor_accuracy UI가 사후 탐지기 역할**  
   - `n=0`인 팩터 = 중립값 100% = 데이터 결손 신호
   - proactive 탐지는 별도 검증 레이어 필요

3. **키 네이밍 불일치는 silent bug**  
   - DB 저장 시 단축명 vs 상수 딕셔너리 전체명 불일치 → 조용히 default 사용
   - 매핑 테이블 또는 DB 정규화로 해결

4. **v1.8 Brier 0.2443 = 결손 포함 기준값**  
   - 수정 후 delta 측정 필수 (개선 예상, 크기 미지)
   - sfr 50.0% 가중치 재검토는 WAR/park_factor 수정 후가 올바른 순서
