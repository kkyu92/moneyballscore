# Changelog

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
