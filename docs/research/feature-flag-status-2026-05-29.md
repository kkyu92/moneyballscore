---
created_at: 2026-05-29
cycle: 1052
scout_issue: 1370
related_plan: null
status: carry-over scout (자율 영역 검토 closure, 사용자 결정 wait)
---

# 기능 플래그 도입 Scout #1370 — Status (cycle 1052)

scout #1370 (2026-05-28 박제) carry-over status snapshot. Cloudflare Flagship 등 기능 플래그 솔루션 통합 검토 — 본 cycle = 자율 영역 검토 closure + 사용자 결정 wait 명확화.

## 1. 박제 evidence (자율 영역, 종료)

### 1.1 현 프로젝트 패턴 점검

`grep -rE "process\.env\.(NEXT_PUBLIC_)?ENABLE_|FEATURE_FLAG|FLAG_"` 검색 결과 = **0건**. 즉 명시적 feature flag 패턴 미사용.

shadow 모델 / kill-switch 패턴은 다음 형태로 존재 (코드 read evidence):
- `v2.0-killswitch.md` (cycle 949~) — cohort 통계 임계 기반 자율 rollback 결정 path
- `v2.1-B-shadow-backfill.md` — shadow 모델 backfill cohort 비교 (코드 path 직접 분기 X, 데이터 박제 layer)
- 본 메인 `develop-cycle` chain pool — 새 chain 추가 시 SKILL.md edit 직접 (flag 토글 X)

본 프로젝트 변경 단위 = git commit + PR + R7 자동 머지. 결과 = main branch 단일 source 즉시 prod. canary / gradual rollout layer 부재.

### 1.2 기능 플래그 도입 시 정합 후보 영역

| 영역 | 현 상태 | flag 도입 ROI |
|---|---|---|
| 예측 가중치 (`DEFAULT_WEIGHTS` v1.8) | source 상수 + git commit 단위 prod 즉시 | low — 이미 shadow cohort 박제 + kill-switch 통계 trigger 작동 |
| 신규 chain 추가 (chain pool) | SKILL.md edit + manual fire | low — 자가 진화 cycle 단위 (cycle 1051 = 43회 자가 진화) |
| 데이터 수집 cron (`scrape-*`) | env var (`KBO_SCRAPE_DELAY` 등) | medium — rate-limit 동적 조정 path, 그러나 prod 안전 evidence 부재 |
| 사용자 가시 UI 신규 섹션 (예: `/v2-preview`) | 라우트 신규 추가 + main merge | low — preview 라우트 분리 이미 작동 (`apps/moneyball/src/app/v2-preview/`) |
| 모델 출력 cohort 분리 (shadow vs prod) | DB 컬럼 `model_version` + `predictions.is_shadow` | **이미 작동** — 본 layer = de-facto feature flag (shadow vs prod cohort 분리, kill-switch trigger 박제) |

**결론**: 본 프로젝트 = 명시적 feature flag system 미보유, 그러나 `model_version` + shadow cohort + kill-switch trigger 조합으로 **모델 차원 점진적 배포 path 이미 작동**. 사용자 가시 UI 차원 / 데이터 수집 차원은 미박제 — 자율 ROI 낮음 (사용자 가시 break risk 사례 0건 누적).

## 2. 옵션 평가 (사용자 결정 영역)

| 옵션 | 정합도 | 사용자 결정 gating |
|---|---|---|
| Cloudflare Flagship | medium — 외부 SaaS 의존, free tier 한도 미확정 (비용 가드 violation risk) | wait — 사용자 결정 |
| Vercel Edge Config | high — Vercel infra 정합, env var 보다 동적 read 가능 | wait — 사용자 결정 |
| GrowthBook (self-hosted) | low — Supabase 추가 인프라 비용 + maintenance |  wait — 사용자 결정 |
| 자체 env var + Edge Config 조합 (현 패턴 + Vercel Edge Config) | high — 점진적 확장 path, 외부 의존 0 | wait — 사용자 결정 |

**비용 가드 (SKILL.md 정합)**: Cloudflare Flagship / GrowthBook = 외부 paid SaaS 가능성. 본 메인 자율 결제 절대 금지 → 사용자 결정 wait.

## 3. 본 cycle 결정 (explore-idea lite)

- 본 메인 자율 fire X — 사용자 결정 영역 (외부 SaaS 결제 + 인프라 추가)
- issue #1370 close 결정 X — carry-over 추적 채널 유지 (cycle 1049 #1206 패턴 정합)
- 신규 코드 / 신규 plan slot 박제 X — 현 패턴 (model_version + shadow cohort + kill-switch) 가 모델 차원 점진적 배포 작동 evidence 충분
- 본 doc = 자율 영역 검토 closure + 사용자 결정 evidence pack

## 4. 다음 자율 fire 조건 (자가 의심 차단)

- 사용자 결정 (옵션 평가 중 1개 선택) 시점 → 본 메인 자율 영역 (PoC 코드 박제, 정합 라우트 식별, kill-switch 통계 trigger 정합) 진입
- 사용자 가시 UI break incident 1건+ (현재 0건) → 자체 env var path 보강 자연 trigger (`fix-incident` chain)
- 사용자 자연 발화 ("feature flag" / "기능 플래그" / "canary" / "shadow rollout") 시 본 doc 박제 evidence 안내

## 5. 참조

- v2.0 kill-switch: `docs/research/v2.0-killswitch.md`
- v2.1-B shadow backfill: `docs/research/v2.1-B-shadow-backfill.md`
- scout #1370 (2026-05-28): original carry-over evidence (Cloudflare Flagship 후보)
- `feedback_data_only_claims` — 옵션 평가는 사용자 결정 후 측정 metric 필요
- 비용 가드 (SKILL.md) — 외부 paid SaaS 자율 결제 절대 금지
- cycle 1049 패턴 (`docs/research/tabpfn-status-2026-05-29.md`) — scout carry-over status doc 정합 format
