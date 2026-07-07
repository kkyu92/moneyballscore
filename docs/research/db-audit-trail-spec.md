# DB 변경 이력 추적 — Supabase/PostgreSQL 도입 가능성 평가

> cycle 1479, 2026-07-07. hub-dispatch issue #2563 처리.
> source: 긱뉴스 스카우트 — dbtrail (MySQL 바이너리 로그 기반 타임머신)

## 현재 상태 (as-is)

### 변경 이력 추적 gap

| 테이블 | created_at | updated_at | 변경 감지 |
|---|---|---|---|
| `predictions` | ✅ | ❌ **없음** | 없음 |
| `pipeline_runs` | ✅ | ❌ 없음 | 없음 (insert-only) |
| `games` | ✅ | ❌ 없음 | 없음 |
| `posts` | ✅ | ✅ | 없음 |
| `agent_memories` | ✅ | ✅ | 없음 |

### 실제 문제 사례

- **cycle 1447 Brier drift 진단**: `confidence` 값이 예측 이후 변경됐는지 확인 불가 → Fable plan S2c 검증에 3+ cycle 소요
- **verify 파이프라인**: `is_correct` / `actual_winner` UPDATE 시각 추적 불가
- **silent prediction drop**: predictions=0 감지 후 원인 분석 시 DB 변경 timeline 없음

## dbtrail 패턴 평가

### dbtrail 핵심 메커니즘 (MySQL)

- MySQL binary log (binlog) tail
- before/after row image 캡처
- point-in-time recovery (PITR)
- row-level replay

### 우리 스택 적용 가능성

| 메커니즘 | MySQL/dbtrail | Supabase/PostgreSQL | 적용 가능? |
|---|---|---|---|
| Binary log tail | binlog row format | WAL (Write-Ahead Log) | ⚠️ 복잡 (logical replication 필요) |
| Before/after image | binlog row event | trigger BEFORE/AFTER | ✅ 가능 (표준 SQL) |
| PITR | binlog replay | pg_basebackup + WAL | Supabase Pro 플랜 기능 |
| Row-level replay | custom | 커스텀 audit table | ✅ 가능 (직접 구현) |

**결론**: dbtrail 직접 포팅 불가 (MySQL 전용). PostgreSQL에서는 trigger 기반 audit table이 가장 실용적.

## PostgreSQL 대안 비교

### Option A — `updated_at` 컬럼 추가 (Tier 1, 즉시)

```sql
ALTER TABLE predictions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE TRIGGER set_predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- **가치**: verify 파이프라인 UPDATE 시각 추적 → Brier drift 진단 단순화
- **비용**: migration 1개, 스토리지 ~8 bytes/row
- **risk**: 0 (기존 데이터에 영향 없음, DEFAULT NOW())
- **즉시 구현 가능**: ✅

### Option B — `predictions_audit` 테이블 (Tier 2, 선택적)

```sql
CREATE TABLE predictions_audit (
  id BIGSERIAL PRIMARY KEY,
  prediction_id INT REFERENCES predictions(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_column TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_by TEXT  -- 'verify-pipeline' | 'manual' | 'cron'
);
```

- **가치**: 컬럼별 변경 내용 추적 (confidence, is_correct, actual_winner)
- **비용**: 스토리지 증가 (UPDATE 당 1 row), 쿼리 복잡도 증가
- **risk**: 1 (경미 — 쓰기 부하 소폭 증가)
- **현 단계 필요성**: 낮음 (Tier 1으로 대부분 커버 가능)

### Option C — Supabase Logical Replication (Tier 3, 불필요)

- Supabase Realtime 이미 사용 가능하지만 persist 없음
- WAL-level 변경 추적은 Pro 플랜 + 별도 구현 필요
- 현 free tier 환경에서 과잉

### Option D — Supabase `supabase_audit` 스키마 (미평가)

- `pg_audit` 확장 기반
- Supabase 공식 지원이나 로컬 실험 필요
- 현 단계 불필요 (Tier 1으로 충분)

## 권장 구현 — Tier 1

### 1단계: `update_updated_at_column()` 함수 + `predictions.updated_at`

migration `041_predictions_updated_at.sql`:

```sql
-- shared trigger function (재사용 가능)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- predictions.updated_at 추가
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 자동 갱신 트리거
CREATE TRIGGER set_predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 예상 효과

- verify 파이프라인 `is_correct` / `actual_winner` UPDATE → `updated_at` 자동 기록
- `predictions WHERE game_id = X` 쿼리 시 `created_at` vs `updated_at` 비교로 verify 완료 여부 즉시 파악
- Brier drift 진단: `WHERE updated_at > created_at + INTERVAL '1 hour'` 쿼리로 예측 후 변경 행 즉시 추출

## 결정

| 항목 | 결정 |
|---|---|
| Tier 1 (updated_at + trigger) | ✅ **이번 cycle 구현** |
| Tier 2 (predictions_audit table) | ⏳ N=10 OOS 이후 model debugging 니즈 재평가 |
| Tier 3 (WAL/logical replication) | ❌ reject (복잡도 대비 가치 낮음) |
| dbtrail 직접 포팅 | ❌ reject (MySQL 전용) |

## 다음 cycle 후속 후보

- Tier 2 평가: n≥10 OOS 이후 `confidence` 변경 패턴 발견 시
- `games.updated_at` 추가 (스케줄 변경 추적): 가치 낮음, 낮은 우선순위
