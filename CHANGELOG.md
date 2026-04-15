# Changelog

## [0.4.3] - 2026-04-15

### Phase v4-3: Compound 루프 완성 + 포스트뷰 시스템

- **rivalry-memory.ts 신규**: 과거 h2h 5경기 + `agent_memories` 읽기 경로 → team-agent 프롬프트 주입. Compound 루프의 빠진 절반을 닫아 에이전트가 과거 학습 내용을 실제로 참조할 수 있게 됨.
- **포스트뷰 시스템**: 경기 종료 후 홈/원정 사후 분석 에이전트 + 심판 factor-level attribution. `predictions.post_game` row로 저장. "왜 틀렸나"가 factor 이름으로 지목됨 (예: `home_bullpen_fip +0.15 편향으로 오예측`).
- **🔴 숨은 버그 수정**: `retro.ts`가 `homeCode`만 insert하고 away 팀 메모리를 완전히 무시하던 버그 수정. Phase C/D 머지 이후 2026-04-15까지 Compound 루프가 실질적으로 50% 반쪽만 작동하던 상태 종료.
- **Validator lenient 모드**: 로컬 Ollama 개발에서 `WARN_LIMIT=5`, 선수명 발명 hard→warn 강등. `NODE_ENV=production`에서는 무조건 strict 강제(프로덕션 환각 leak 차단).
- **자동 postview 트리거**: `live-update.yml` cron 윈도를 2시간 확장(18:00~00:50 KST)하고 내부에서 경기 종료 감지 시 `runPostviewDaily` 자동 호출. 00:50 이후 종료 극단 경기는 다음날 아침 daily-pipeline fallback으로 cleanup.
- **migration 009**: `agent_memories` TRUNCATE + `UNIQUE(team_code, memory_type, content)` + `idx_agent_memories_read` 인덱스 + `proposals` 테이블 신규 (백테스트 스키마 준비, v5에서 자동화).
- **memory_type 분류 휴리스틱**: strength/weakness/pattern/matchup 4종 분류 + valid_until 7일 유효기간 + source_game_id FK + upsert(onConflict) 중복 방지.
- **dev-postview.ts 스크립트**: Ollama 로컬 드라이런 ($0, 60s, 3010 tokens). factorErrors가 실제 factor 이름 정확히 지목하는 것 확인.
- **테스트 32건 추가** → 총 129/129 통과

### 검증 결과

- `/plan-eng-review`: 8 findings 전부 플랜 반영 (A1~A5 architecture + C1~C3 code quality)
- Ollama dev-debate + dev-postview 드라이런: Claude API 크레딧 0원으로 전체 경로 검증
- 프로덕션 Claude strict 경로 재트리거 1회 성공: 5경기 모두 `v2.0-debate` row 생성, validator reject 0건, Sonnet 분석문 정상 저장

## [0.2.0] - 2026-04-14

### Phase 2 전체 구현 + 프로덕션 배포

- **3소스 데이터 파이프라인**: KBO 공식 API + Fancy Stats + FanGraphs에서 매일 자동 수집
- **예측 엔진 v1.5**: 10팩터 가중합산 (FIP, xFIP, wOBA, 불펜, 최근폼, WAR, Elo, SFR, 상대전적, 구장)
- **이닝별 라이브 업데이트**: 경기 중 10분 간격 승리확률 보정
- **대시보드**: Recharts 누적 적중률 + 팀별 성과 차트
- **예측 투명성**: 팩터별 기여도 시각화 (FactorBreakdown 컴포넌트)
- **Telegram 봇**: 예측 생성 + 결과 적중률 자동 알림
- **파이프라인 모니터링**: 실행 히스토리 DB + 헬스체크 API
- **디자인 리뷰**: 다크 그린 컬러 시스템, 승리확률 표시, 히어로 그라데이션

### 인프라

- GitHub Actions cron 2회/일 (KST 15:00 + 23:00)
- Vercel 배포: moneyballscore.vercel.app
- Supabase 마이그레이션 001~005
- 팀 코드 KBO 공식 API 코드로 통일

## [0.1.0] - 2026-04-14

### Phase 1 초기 구축

- 모노레포 셋업 (pnpm + turborepo)
- Next.js 16 App Router UI 셸
- Supabase 스키마 + RLS
- 예측 카드 컴포넌트, 적중률 요약, 방법론 페이지
