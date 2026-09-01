import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// wave-658 (cycle 2338, explore-idea heavy) — /mlb/analysis 는 plan #28(cycle 2315~2323)
// 로 MVP+4-phase 전부 완성됐지만 en/mlb/analysis 미러는 의도적 scope 축소(cycle 2315 phase1
// 커밋 "EN 변형은 phased 관례 후속" 명시)로 미배선 상태였음. Header/Footer withLocale()
// 은 이미 /mlb/ prefix 전체를 /en/mlb/ 로 blanket 치환하는 규칙(cycle 2139 fix)이라
// analysis 만 예외 목록에 없어 실제로는 클릭 시 404 나는 live 버그였음(cycle 2227 과
// 동일 family — 그 때는 반대로 /mlb/reviews 를 예외 처리해 해결). 본 wave 는 예외
// 추가 대신 실제 페이지를 만들어 해결. MlbTeamStrengthGrid 는 locale prop 추가로
// 현지화. PickButton(커뮤니티 픽 투표 UI)은 당시 en 화 범위 밖으로 생략했으나
// wave-664(cycle 2342, explore-idea heavy)에서 locale prop 추가 + en 페이지 배선 완료.

const koPage = readFileSync(
  path.resolve(__dirname, '../mlb/analysis/page.tsx'),
  'utf8',
);
const enPage = readFileSync(
  path.resolve(__dirname, '../en/mlb/analysis/page.tsx'),
  'utf8',
);
const analysisData = readFileSync(
  path.resolve(__dirname, '../mlb/analysis/analysis-data.ts'),
  'utf8',
);
const header = readFileSync(path.resolve(__dirname, '../../components/layout/Header.tsx'), 'utf8');
const sitemap = readFileSync(path.resolve(__dirname, '../sitemap.ts'), 'utf8');

describe('wave-658 — /en/mlb/analysis 영어 미러 신규', () => {
  it('getTodayMlbAnalysisRows 가 analysis-data.ts 로 이동 + ko/en 양쪽 재사용 (중복 로직 방지)', () => {
    expect(analysisData).toContain('export async function getTodayMlbAnalysisRows');
    expect(koPage).not.toContain('async function getTodayMlbAnalysisRows');
    expect(koPage).toContain('getTodayMlbAnalysisRows');
    expect(enPage).toContain('getTodayMlbAnalysisRows');
  });

  it('en 페이지 canonical + hreflang alternates 배선 (ko 페이지도 en 역참조 추가)', () => {
    expect(enPage).toContain('${SITE_URL}/en/mlb/analysis');
    expect(enPage).toContain('ko: `${SITE_URL}/mlb/analysis`');
    expect(koPage).toContain('en: `${SITE_URL}/en/mlb/analysis`');
  });

  it('en 페이지 내부 링크가 전부 /en/mlb/* prefix 사용 (KO 라우트로 이탈 금지, cycle 2139/2227 family 재발 차단)', () => {
    expect(enPage).not.toMatch(/href=\{?`\/mlb\//);
    expect(enPage).not.toMatch(/href="\/mlb\//);
    expect(enPage).toContain('/en/mlb/games/');
    expect(enPage).toContain('/en/mlb/standings');
    expect(enPage).toContain('/en/mlb/accuracy');
  });

  it('Breadcrumb locale="en" 사용', () => {
    expect(enPage).toContain('locale="en"');
  });

  it('MlbTeamStrengthGrid locale prop — en 은 locale="en" 전달, href/문구 현지화', () => {
    expect(enPage).toContain('<MlbTeamStrengthGrid rows={teamStrengthRows} locale="en" />');
  });

  it('PickButton locale="en" 전달 — wave-664 현지화 후속으로 en 미러도 커뮤니티 픽 투표 UI 포함', () => {
    expect(enPage).toContain('<PickButton');
    expect(enPage).toContain('locale="en"');
  });

  it('buildMlbAccuracySummary("en") locale 인자 전달', () => {
    expect(enPage).toContain("buildMlbAccuracySummary('en')");
  });

  it('헤더 nav + sitemap.ts 즉시 배선 (cycle 2153 family 재발 차단)', () => {
    expect(header).toContain('/mlb/analysis');
    expect(sitemap).toContain('${SITE_URL}/en/mlb/analysis`');
  });

  it('weekly/monthly review link 카드 en 배선 (cycle 2736 IA fallback — KO 는 wave-624 부터 있었으나 EN 은 최초 en 배선(wave-658) 시 누락돼 EN 사용자가 hub 통해 /en/mlb/reviews/weekly|monthly 진입 불가 상태였음)', () => {
    expect(enPage).toContain('getCurrentWeek(new Date(), \'en\')');
    expect(enPage).toContain('getCurrentMonth(new Date(), \'en\')');
    expect(enPage).toContain('/en/mlb/reviews/weekly/${currentWeek.weekId}');
    expect(enPage).toContain('/en/mlb/reviews/monthly/${currentMonth.monthId}');
    expect(enPage).toContain('getMlbPeriodStats');
  });
});
