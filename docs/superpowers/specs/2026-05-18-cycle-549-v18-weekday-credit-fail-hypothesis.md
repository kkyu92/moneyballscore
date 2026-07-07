# v1.8 평일 cron 100% credit-fail / 주말 100% real-debate — 가설 + 검증 spec

**Cycle**: 549 (2026-05-18)
**Chain**: explore-idea (lite, carry-over)
**Status**: ~~spec only — 구현 보류 (사용자 review 대기 / n=150 도달 후 후속 fix-incident heavy 권장)~~ **cycle 1493 갱신 (wave 217): superseded — v1.8 유지 확정 (cycle 1460, n=178 crossed, Brier diff <1pp) → v2.0 upgrade 불필요. 본 spec 후속 trigger (n=150 도달 후 fix-incident heavy) 무효화, spec = 역사 기록으로 보존.**

---

## 출처 carry-over

- **cycle 542 op-analysis lite SUCCESS**: 평일 (Wed/Thu/Fri 16:17 KST cron) = 100% credit-fail conf=0.3 / 주말 (Sat/Sun 11:18·14:18 KST cron) = 100% real-debate conf=0.45~0.58
- **cycle 502 lesson `v1.8 credit 복구 verified`**: ANTHROPIC_API_KEY credit 복구 완료 (5/16 user action) — credit 소진 단일 가설로는 평일 100% fail / 주말 100% success 분리 패턴 설명 불가
- **cycle 383 lesson `anthropic-credit-silent-fallback-v18.md`**: 초기 credit 소진 가설 + PR #372 label 강등 fix
- **TODOS.md v2.0 추적**: ~~n=150 임계 / 현재 v1.8 real-debate 10건만~~ **cycle 1493 갱신 (wave 217): closed — cycle 1447 n=161 crossed → cycle 1460 v1.8 유지 확정, TODOS 추적 항목 자연 archive.**

## 패턴 evidence

```
predictions 테이블 v1.8 scoring_rule = 25건
  - real-debate (totalTokens>0, conf 0.45~0.58): 10건
    - 모두 주말 (Sat 5 + Sun 5)
  - credit-fail (totalTokens=0, conf=0.30, agentError): 15건
    - 모두 평일 (Tue/Wed/Thu/Fri)
```

요일별 분리 = 100% 단일 카운터 패턴. 단순 credit 소진 시간 분포로는 우연 확률 낮음 (binom 가정 시 p < 0.001).

## 시각 mapping

| 요일 | cron UTC | KST | game ST | predict fire 윈도우 (game-3h~game) |
|---|---|---|---|---|
| 월~금 | 07:17 | 16:17 | 18:30 | fire ✅ (마지막 cron) |
| 토 | 02:17 | 11:17 | 14:00 | fire ✅ |
| 토 | 05:17 | 14:17 | 17:00 | fire ✅ |
| 일 | 02:17 / 05:17 | 11:17 / 14:17 | 14:00 / 17:00 | fire ✅ |

평일 fire = **UTC 07:17 만**. 주말 fire = **UTC 02:17 + 05:17**. → fire 시각 자체 (UTC 07:17 vs UTC 02:17/05:17) 가 분리 변수.

## 가설 후보 (uncertain)

### H1. Anthropic API region-specific rate-limit / availability (UTC 07:00~08:00 window)
- Anthropic API gateway region 또는 backend deployment 시간대 issue
- UTC 07:17 = 미국 동부 02:17 KST 변환 새벽 — backend maintenance window 가능성
- 검증: `wrangler tail` 또는 Sentry agentError detail 에서 HTTP status code + retry-after 측정. 평일 fire 5건의 status 검증

### H2. Cloudflare Worker outbound IP / KV 캐시 시간대 anomaly
- Cloudflare 무료 tier worker = shared pool. 시각마다 outbound IP 변경 가능
- 특정 IP block 이 Anthropic 측 rate-limit 또는 detection 트리거
- 검증: `cloudflare-worker/` 로깅 강화 — request_id + remote IP + response headers 박제

### H3. Anthropic API credit 일자별 quota
- 일일 quota = UTC 자정 reset 가정 시 UTC 07:17 = 자정 후 7.3h. 평일 daily-pipeline 호출량 누적 후 한도 도달 가능
- 주말 fire = UTC 02:17 (자정 후 2.3h) = quota fresh
- 검증: Anthropic console 에서 daily usage time-series 측정. credit 복구 (5/16) 후에도 평일 fail 잔존 = quota 한도 가설 보강

### H4. KBO API source freshness — SP 확정 시각
- 게임-3h 윈도우 fire 시 SP 미확정 시 quant-only fallback (cycle 358 박제)
- 평일 18:30 게임 → predict fire 15:30~18:30 → SP 확정이 평일 16:17 fire 시점에 없을 가능성?
- 검증: `sp_confirmation_log` 평일/주말 SP 확정 시각 mapping. SP 미확정 시 agent 호출 자체 skip 인지 코드 read

## 검증 step (다음 fix-incident heavy chain 권장)

1. **데이터 풀**: `predictions where scoring_rule='v1.8'` 25건 전체 read → `metadata->>'agentError'` + `metadata->>'totalTokens'` + `created_at` 추출
2. **agentError detail 분류**: HTTP status / error message 패턴 분류 — credit_exhausted vs rate_limit vs timeout vs SP unavailable
3. **Worker log read**: `wrangler tail` 또는 Cloudflare dashboard logs — 평일 fire 5건 + 주말 fire 5건 raw 요청 응답 비교
4. **SP timing cross-check**: `sp_confirmation_log` 평일/주말 시각별 source='kbo-official' / source='naver' 확정 시각 — 평일 16:17 fire 시점 SP 확정 여부
5. **Anthropic console**: usage time-series — UTC 02:17 vs 07:17 fire 시각의 daily 누적 비교 (사용자 action 의존)

## 의도된 결과 vs Action 분기

- **의도된 결과**: SP 미확정 (H4) 시 평일 cron 만 fail 자연 — fallback 라벨 정상. **action 불요**
- **버그**: H1/H2/H3 시 cron 시각 조정 (16:17 → 17:17 또는 17:47) 또는 retry-after 보정. **action 필요**

~~n=150 임계까지 31건 남음. 본 spec 의 검증 step 은 그동안 데이터 누적되는 시각 (1~2주) 안 자연 추가 검증 가능.~~ **cycle 1493 갱신 (wave 217): closed — cycle 1447 n=161 crossed → cycle 1460 v1.8 유지 확정 (Brier default 0.2443 vs learned 0.2458 diff <1pp), n=150 대기 자연 소멸.**

## chain pool 변화 X

본 spec = 데이터 수집 + 가설 우선순위. 신규 chain 후보 아님 (기존 fix-incident heavy / operational-analysis heavy 으로 자연 redirect).

## 후속

- 다음 explore-idea trigger 8 fire 시 본 spec read → 데이터 충분 시 fix-incident heavy 자연 발화
- 또는 사용자 자연 발화 ("평일 cron 왜 fail?" / "Anthropic credit 또?") 시 즉시 진입
- ~~n=150 도달 (v1.8 real-debate 표본 ≥ N) 시 op-analysis heavy 에서 가중치 v2.0 확정 + 본 spec H1~H4 별 분리 측정 통합 권장~~ **cycle 1493 갱신 (wave 217): closed — v1.8 유지 확정 (cycle 1460, n=178 crossed, Brier default 0.2443 vs learned 0.2458 diff <1pp) → v2.0 upgrade 불필요, 본 후속 trigger 무효화.**

## 관련

- `docs/lessons/2026-05-14-anthropic-credit-silent-fallback-v18.md`
- `docs/superpowers/specs/2026-05-15-cycle-471-silent-drift-prevention.md`
- TODOS.md v2.0 가중치 추적 섹션
- cycle 542 cycle_state JSON (`~/.develop-cycle/cycles/542.json`)
