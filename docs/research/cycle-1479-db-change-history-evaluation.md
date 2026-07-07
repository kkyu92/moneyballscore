---
cycle: 1479
chain: explore-idea (lite)
issue: 2563
subtype: spec
status: draft
created: 2026-07-07
---

# DB 데이터 변경 이력 추적 및 복구 전략 평가

## 배경

Issue #2563 (hub-dispatch, 긱뉴스 스카우트 자동 생성) = dbtrail (MySQL 바이너리 로그 테일링 툴, 모든 행 변경 before/after 이미지 박제 + PITR) 을 moneyballscore 에 이식 가능성 검토.

## 우리 스택 vs dbtrail 스택 갭

| 축 | dbtrail | moneyballscore |
|---|---|---|
| DB | MySQL | Supabase (Postgres) |
| 변경 추적 방식 | binlog tailing (row-level before/after) | 부재 |
| PITR | dbtrail 자체 | Supabase Pro tier ($25+/mo, 7일) — **미가입** |
| Snapshot | 없음 | 부분 (`pitcher_stats.captured_at` migration 016) |

**결론**: dbtrail 직접 이식 불가 (MySQL binlog ≠ Postgres WAL). 개념만 참고. Postgres native 대안 3개 비교.

## 우리 DB 실제 갭 진단

### critical 테이블 (변경 이력 필요도 상)

- `predictions` — 매일 KBO 경기 예측 upsert. 잘못 upsert 시 되돌리기 필요. **현재 감사 불가**
- `game_results` — verify.ts 가 result 채움. 잘못된 결과 upsert 시 predictions.is_correct 오염. **감사 불가**
- `pipeline_runs` — silent skip 진단용. 이미 history 성격 (append-only), 별도 audit X
- `agent_memories` — retro.ts 가 wrong 케이스 학습. `is_correct=false` filter 반영 시점 이력 X. **감사 불가**
- `pitcher_stats` — migration 016 이 이미 snapshot pattern (captured_at). **부분 감사 있음**

### 실제 문제 사례 (drift-cases.md evidence)

- 사례 3 (2026-04-15) — model_version VARCHAR overflow → predictions 컬럼 silent 리턴, 데이터 손실
- 사례 4 — homeCode 반쪽 작동 → predictions.home_team_code silent 오염
- 사례 11 — predict_final window_too_late silent silent drop (predictions=0 + games_found>0 mismatch)

**공통 pattern**: upsert 후 잘못된 값이 박제되면 발견 지연 (retro/verify 후 발견). **before 값 조회 불가** = 진단 근거 부족 + 되돌리기 결정 어려움.

## 대안 3안 비교

### 안 A: Postgres audit trigger (자체 구현, 무료)

Postgres native TRIGGER + `audit_log` 테이블. Supabase 무료 tier 내 자체 배포.

```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,        -- INSERT / UPDATE / DELETE
  row_pk JSONB NOT NULL,          -- 원래 row PK (테이블별 다름)
  before_data JSONB,              -- UPDATE/DELETE 이전 row
  after_data JSONB,               -- INSERT/UPDATE 이후 row
  changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by TEXT DEFAULT current_user
);

CREATE INDEX idx_audit_log_table_time ON audit_log(table_name, changed_at DESC);

CREATE OR REPLACE FUNCTION audit_trigger_fn() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(table_name, operation, row_pk, after_data)
    VALUES (TG_TABLE_NAME, 'INSERT', jsonb_build_object('id', NEW.id), row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(table_name, operation, row_pk, before_data, after_data)
    VALUES (TG_TABLE_NAME, 'UPDATE', jsonb_build_object('id', NEW.id), row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(table_name, operation, row_pk, before_data)
    VALUES (TG_TABLE_NAME, 'DELETE', jsonb_build_object('id', OLD.id), row_to_json(OLD)::jsonb);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_predictions AFTER INSERT OR UPDATE OR DELETE ON predictions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
-- + game_results / agent_memories 반복
```

- **장점**: 무료 tier 안 완전. 완전한 before/after. 되돌리기 SQL 생성 가능. 3~4 테이블 한정
- **단점**: 매 write 마다 trigger 오버헤드 (~10~20% 추정, 미측정). audit_log 무한 성장 → 파티션/pruning 필요. Supabase 무료 db size 8GB 한계
- **비용**: $0 (무료 tier), 개발 ~4 시간 (migration + trigger + pruning cron)
- **리스크**: audit_log 성장 폭주 시 무료 tier 8GB 한도 조기 도달. 대응 = 30일 이상 데이터 자동 삭제 cron

### 안 B: 앱 계층 write-log (선택적)

핵심 write 함수 wrapper 에 log 저장. 예: `upsertPrediction()` 안 이전 값 fetch + audit 저장.

- **장점**: DB 오버헤드 X, 무료 tier 부담 X, wrapper 코드로 개발자 인지 향상
- **단점**: 새 write 경로 누락 위험 (silent skip). direct SQL / migration 시 우회. 완전성 보장 X
- **비용**: $0, 개발 ~2 시간 per critical table
- **리스크**: 개발자 누락 → 사례 3/4/11 재발 가능

### 안 C: Supabase Pro tier PITR (외부 유료)

Supabase Pro $25/mo → 7일 PITR 자동. 별도 audit table X.

- **장점**: 코드 변경 0. PITR 자동
- **단점**: **자율 결제 절대 금지** (SKILL 비용 가드). 사용자 결정 대기. row-level before/after 조회 아님 (특정 시점 전체 restore only)
- **비용**: $25+/mo, 개발 0
- **리스크**: 결제 결정은 사용자 영역. carry-over 채널 (`memory:` subtype=needs) 만

## 결정 rubric (5축 자가 검증)

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"

  안_A (Postgres audit trigger):
    가치: high   # sales 3/4/11 재발 시 진단 근거 확보
    시간_비용: medium  # ~4시간 (migration + trigger + pruning cron)
    risk: 2     # audit_log 성장 폭주 시 8GB 한도, mitigation = pruning cron
    자율_가능: yes  # 무료 tier + 코드 자율 배포
    의존성: none

  안_B (앱 write-log wrapper):
    가치: medium  # 완전성 보장 X (개발자 누락 위험)
    시간_비용: small   # ~2시간/테이블
    risk: 1     # 새 write 경로 우회 silent 리스크
    자율_가능: yes
    의존성: none

  안_C (Supabase Pro PITR):
    가치: high
    시간_비용: none
    risk: 3     # 자율 결제 절대 금지 룰 위반
    자율_가능: no   # 사용자 결제 결정 대기
    의존성: 사용자
```

**Tier 분류**:
- **Tier 1** (즉시 fire): 없음 — 4시간 규모 = small 초과
- **Tier 2** (자가 검증 후 fire): 안 A — 다음 lite explore 또는 heavy explore-idea/expand-scope 매핑
- **Tier 3** (별도 plan 분리): 안 A + partitioning + pruning cron 전체 스택 (large scope)
- **Tier 4** (사용자 영역): 안 C — Supabase Pro 결제 결정 wait

## 권장 (본 spec 결론)

**최적 = 안 A Tier 2** (Postgres audit trigger, 3 테이블 predictions/game_results/agent_memories 한정 + 30일 pruning cron).

**다음 사이클 후속 후보** (carry-over):
1. **heavy explore-idea / expand-scope 사이클** — 안 A 상세 설계 (migration draft + pruning cron + audit_log RLS policy + before/after diff 조회 view)
2. **info-architecture-review** — audit_log 조회 UI 추가 여부 (관리자 debug 도구)
3. **fix-incident carry-over** — 사례 3/4/11 재발 시 안 A 를 즉시 fire trigger

**안 C carry-over**: 사용자 결제 결정 대기. `memory:` subtype=needs 채널 dispatch 검토 (본 사이클 partial 마감 시 자율 X).

## 다음 cycle 후속 후보

- heavy explore-idea 또는 expand-scope: 안 A 상세 migration draft (predictions/game_results/agent_memories 3 테이블 + pruning cron + view)
- fix-incident carry-over: 안 A 를 사례 3/4/11 재발 즉시 fire trigger 로 등록
- info-architecture-review: audit_log 조회 관리자 UI 검토
- memory dispatch: 안 C 사용자 결제 결정 needs carry-over (본 사이클 spec 만 박제, 자율 dispatch X)
