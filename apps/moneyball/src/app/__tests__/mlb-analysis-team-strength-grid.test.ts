import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// plan #28 Phase 2 잔여 carry-over(cycle 2316 TODOS "TeamStrengthGrid MLB 대체 설계")
// 를 cycle 2323(explore-idea heavy) 가 해소. KBO TeamStrengthGrid 는 predictions.home_elo
// (cycle 2349)/home_recent_form(cycle 2353, 둘 다 이제 실측 반영) 모델 팩터 기반이지만
// 이 화면은 "모델 입력값"이 아니라 mlb_schedule 의 실제 완료 경기 결과로 "진짜 전적"
// (최근 5경기 승패 + 연승/연패) 을 계산하는 대체 설계라 그대로 포팅하지 않음(목적 자체가
// 다름 — 저장 여부와 무관).

const buildFile = readFileSync(
  path.resolve(__dirname, '../../lib/mlb/buildMlbTeamStrengthSnapshot.ts'),
  'utf8',
);
const componentFile = readFileSync(
  path.resolve(__dirname, '../../components/analysis/MlbTeamStrengthGrid.tsx'),
  'utf8',
);
const page = readFileSync(path.resolve(__dirname, '../mlb/analysis/page.tsx'), 'utf8');

describe('MLB /analysis 팀 전력 현황 (TeamStrengthGrid 대체 설계)', () => {
  it('buildMlbTeamStrengthSnapshot 이 mlb_schedule 단일 쿼리로 전체 팀 조회 (팀별 N+1 회피, buildMlbDivisionStandings 패턴)', () => {
    expect(buildFile).toContain("from('mlb_schedule')");
    expect(buildFile).toContain("eq('status', 'final')");
    expect(buildFile).not.toMatch(/for\s*\(.*MlbTeamCode.*\)\s*{[\s\S]*await supabase/);
  });

  it('computeTeamRecentRecord/computeTeamStreak 재사용 (KBO/MLB StreakGame 구조 호환, 신규 MLB_ 접두 중복 함수 X)', () => {
    expect(buildFile).toContain("from '@/lib/teams/buildTeamProfile'");
    expect(buildFile).toContain('computeTeamRecentRecord');
    expect(buildFile).toContain('computeTeamStreak');
    // predictions.home_elo/home_recent_form (모델 팩터) 조회 자체가 없어야 함 — .select() 호출부만 검사
    // (파일 상단 주석은 왜 안 쓰는지 설명하려 두 컬럼명을 언급하므로 전체 파일 grep 은 오탐).
    const selectCalls = buildFile.match(/\.select\(\s*'[^']*'/g) ?? [];
    for (const call of selectCalls) {
      expect(call).not.toContain('home_elo');
      expect(call).not.toContain('home_recent_form');
    }
  });

  it('mlb_schedule StatsAPI 코드 → canonical 정규화 (normalizeMlbTeamCode, buildMlbTeamProfile.ts:223 패턴 정합)', () => {
    expect(buildFile).toContain('normalizeMlbTeamCode');
  });

  it('MlbTeamStrengthGrid 가 /mlb/team/[code] 딥링크 + MlbTeamLogo 사용 (KBO TeamStrengthGrid /teams/[code] 대응)', () => {
    expect(componentFile).toContain("locale === 'en' ? '/en/mlb/team' : '/mlb/team'");
    expect(componentFile).toContain('${teamHrefPrefix}/${row.teamCode}');
    expect(componentFile).toContain('MlbTeamLogo');
  });

  it('DESIGN.md 토큰 준수 — hex 색상 하드코딩 0건 (KBO TeamStrengthGrid 원본도 text-[10px]/var(--color-*) 브래킷 관례 사용 — 폰트사이즈/CSS변수 브래킷은 기존 관례라 색상 하드코딩만 검사)', () => {
    expect(componentFile).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });

  it('page.tsx 에 팀 전력 현황 섹션 배선 + /mlb/standings 딥링크', () => {
    expect(page).toContain('MlbTeamStrengthGrid');
    expect(page).toContain('buildMlbTeamStrengthSnapshot');
    expect(page).toContain('팀 전력 현황');
    expect(page).toContain('href="/mlb/standings"');
  });
});
