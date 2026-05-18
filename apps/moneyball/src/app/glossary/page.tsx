import type { Metadata } from 'next';
import Link from 'next/link';
import { DEFAULT_WEIGHTS } from '@moneyball/shared';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

export const metadata: Metadata = {
  title: '야구 통계 용어 사전',
  description:
    'KBO 승부예측에 쓰이는 세이버메트릭스 용어 사전. FIP, xFIP, wOBA, WAR, Elo, SFR, wRC+, ISO 등 15개 지표의 정의, 정상 범위, 우리 모델 가중치를 한 페이지에서 확인.',
  alternates: { canonical: 'https://moneyballscore.vercel.app/glossary' },
};

type GlossaryEntry = {
  id: string;
  abbr: string;
  korean: string;
  fullName: string;
  definition: string;
  range: string;
  modelUsage?: string;
  source: string;
};

type GlossaryCategory = {
  title: string;
  description: string;
  entries: GlossaryEntry[];
};

const CATEGORIES: GlossaryCategory[] = [
  {
    title: '투수 지표',
    description: '투수의 순수 실력을 평가. 수비 영향을 분리해서 본다.',
    entries: [
      {
        id: 'fip',
        abbr: 'FIP',
        korean: '수비 무관 평균자책점',
        fullName: 'Fielding Independent Pitching',
        definition:
          '투수가 직접 통제하는 결과(삼진·볼넷·홈런)만으로 산출한 평균자책점. 수비·운의 영향을 제거해서 ERA보다 미래 성적 예측에 정확하다.',
        range: 'KBO 평균 ≈ 4.50. 3.50 이하 = 에이스, 5.00 이상 = 부진.',
        modelUsage: `선발 투수: 가중치 ${Math.round(DEFAULT_WEIGHTS.sp_fip * 100)}% (최대)`,
        source: 'KBO Fancy Stats',
      },
      {
        id: 'xfip',
        abbr: 'xFIP',
        korean: '기대 FIP',
        fullName: 'Expected FIP',
        definition:
          'FIP 의 홈런율을 리그 평균으로 정규화한 지표. 작은 표본에서 발생하는 홈런 변동성(운)을 제거. 시즌 후반 성적 예측에 강하다.',
        range: 'KBO 평균 ≈ 4.50. FIP 와 큰 차이 = 홈런운 가능성.',
        modelUsage: `선발 투수: 가중치 ${Math.round(DEFAULT_WEIGHTS.sp_xfip * 100)}%`,
        source: 'KBO Fancy Stats',
      },
      {
        id: 'bullpen-fip',
        abbr: '불펜 FIP',
        korean: '불펜 평균자책점',
        fullName: 'Bullpen FIP',
        definition:
          '중계·마무리 투수진 전체의 가중 평균 FIP. 선발이 5~6회에 강판된 후 경기 결과를 좌우. 박빙 경기일수록 영향력이 커진다.',
        range: '리그 1위급 ≈ 3.80, 하위 ≈ 5.20.',
        modelUsage: `가중치 ${Math.round(DEFAULT_WEIGHTS.bullpen_fip * 100)}%`,
        source: 'KBO Fancy Stats',
      },
    ],
  },
  {
    title: '타격 지표',
    description: '타자의 종합 생산성을 평가. 안타 종류별 가치를 다르게 본다.',
    entries: [
      {
        id: 'woba',
        abbr: 'wOBA',
        korean: '가중 출루율',
        fullName: 'weighted On-Base Average',
        definition:
          '단타·2루타·3루타·홈런·볼넷 등 각 출루 결과의 실제 득점 기여도를 가중치로 합산. 단순 타율보다 득점 예측력이 훨씬 높다.',
        range: 'KBO 평균 ≈ .330. .380+ = MVP급, .300 이하 = 부진.',
        modelUsage: `타선 화력: 가중치 ${Math.round(DEFAULT_WEIGHTS.lineup_woba * 100)}% (최대)`,
        source: 'KBO Fancy Stats',
      },
      {
        id: 'wrc-plus',
        abbr: 'wRC+',
        korean: '조정 가중 득점 창출',
        fullName: 'weighted Runs Created Plus',
        definition:
          '구장·리그 평균 보정 후 한 타자가 만든 득점을 100 기준 지수로 표현. 100 = 리그 평균, 130 = 평균보다 30% 더 생산.',
        range: '120+ = 주전급, 150+ = 최상위, 80 이하 = 부진.',
        source: 'FanGraphs (보조 검증)',
      },
      {
        id: 'iso',
        abbr: 'ISO',
        korean: '순수 장타력',
        fullName: 'Isolated Power',
        definition:
          '장타율 − 타율. 단타를 뺀 장타 능력만 추출. 홈런·2루타·3루타 생산력을 단일 숫자로 본다.',
        range: 'KBO 평균 ≈ .150. .220+ = 거포, .100 이하 = 단타형.',
        source: 'FanGraphs (보조 검증)',
      },
      {
        id: 'bb-rate',
        abbr: 'BB%',
        korean: '볼넷 비율',
        fullName: 'Walk Rate',
        definition:
          '전체 타석 중 볼넷 비율. 선구안과 출루 기여도의 핵심 지표. 클러치 능력보다 BB% 가 미래 성적 예측에 안정적.',
        range: 'KBO 평균 ≈ 8.0%. 12%+ = 우수, 5% 이하 = 부족.',
        source: 'FanGraphs (보조 검증)',
      },
      {
        id: 'k-rate',
        abbr: 'K%',
        korean: '삼진 비율',
        fullName: 'Strikeout Rate',
        definition:
          '전체 타석 중 삼진 비율. 타자: 낮을수록 우세 / 투수: 높을수록 우세. 시즌별 변동이 작아 신뢰도 높다.',
        range: '타자: KBO 평균 ≈ 18%, 25%+ 부진 / 투수: 22%+ 우수.',
        source: 'FanGraphs (보조 검증)',
      },
    ],
  },
  {
    title: '종합 지표',
    description: '여러 능력을 단일 숫자로 합산. 야수·투수 비교 가능.',
    entries: [
      {
        id: 'war',
        abbr: 'WAR',
        korean: '대체 선수 대비 승리 기여도',
        fullName: 'Wins Above Replacement',
        definition:
          '한 선수가 대체 가능한 평균 선수보다 팀에 추가로 가져온 승리 수. 타격·수비·주루·투구를 모두 합산. 시즌 단위로 누적.',
        range: '시즌 5+ = MVP 후보, 3+ = 올스타급, 0 이하 = 대체급.',
        modelUsage: `팀 합산 WAR: 가중치 ${Math.round(DEFAULT_WEIGHTS.war * 100)}%`,
        source: 'KBO Fancy Stats',
      },
      {
        id: 'sfr',
        abbr: 'SFR',
        korean: '세이버메트릭 수비 득점',
        fullName: 'Sabermetric Fielding Runs',
        definition:
          'KBO Fancy Stats 의 수비 평가 지표. 포지션별 평균 야수 대비 실점 억제 기여도를 합산. 양수 = 평균 이상 수비.',
        range: '+5 이상 = 골든글러브급, −5 이하 = 수비 부담.',
        modelUsage: `팀 수비력: 가중치 ${Math.round(DEFAULT_WEIGHTS.sfr * 100)}%`,
        source: 'KBO Fancy Stats',
      },
    ],
  },
  {
    title: '팀·맥락 지표',
    description: '경기 외부 요인. 팀 전력·구장·일정 등 정량화.',
    entries: [
      {
        id: 'elo',
        abbr: 'Elo',
        korean: 'Elo 레이팅',
        fullName: 'Elo Rating',
        definition:
          '체스에서 유래한 상대적 전력 점수. 강팀에게 이기면 많이 오르고 약팀에 지면 많이 내려간다. 매 경기 결과로 갱신.',
        range: 'KBO 평균 1500. 1600+ = 상위권, 1400 이하 = 하위권.',
        modelUsage: `가중치 ${Math.round(DEFAULT_WEIGHTS.elo * 100)}% (정보가치 최강)`,
        source: 'KBO Fancy Stats',
      },
      {
        id: 'recent-form',
        abbr: '최근폼',
        korean: '최근 폼',
        fullName: 'Recent Form',
        definition:
          '최근 10경기 승률. 시즌 누적 성적보다 현재 팀 상태(부상자 복귀, 슬럼프 등)를 반영. 단기 모멘텀 지표.',
        range: '0.700+ = 상승세, 0.300 이하 = 슬럼프.',
        modelUsage: `가중치 ${Math.round(DEFAULT_WEIGHTS.recent_form * 100)}%`,
        source: 'KBO 공식',
      },
      {
        id: 'head-to-head',
        abbr: '상대전적',
        korean: '상대 전적',
        fullName: 'Head-to-head',
        definition:
          '시즌 동안 두 팀이 맞붙은 경기에서 승률. 특정 팀에 강한 상성(천적·먹잇감)이 통계적으로 존재할 수 있다.',
        range: '7할 이상 = 명확한 상성, 5할 근처 = 노이즈.',
        modelUsage: `가중치 ${Math.round(DEFAULT_WEIGHTS.head_to_head * 100)}% (v1.8 축소)`,
        source: 'KBO 공식',
      },
      {
        id: 'park-factor',
        abbr: '구장보정',
        korean: '구장 보정',
        fullName: 'Park Factor',
        definition:
          '홈구장 특성을 100 기준 지수로 표현. 100 초과 = 타자 친화 (홈런↑), 100 미만 = 투수 친화 (실점↓). 같은 타자라도 잠실보다 대구에서 홈런 더 잘 친다.',
        range: '잠실 ≈ 95 (투수 친화) / 대구 ≈ 108 (극단 타자 친화) / 고척 ≈ 92 (극단 투수 친화).',
        modelUsage: `가중치 ${Math.round(DEFAULT_WEIGHTS.park_factor * 100)}%`,
        source: 'KBO 공식',
      },
      {
        id: 'home-advantage',
        abbr: '홈어드밴티지',
        korean: '홈 어드밴티지',
        fullName: 'Home Advantage',
        definition:
          '홈경기에서 유리한 정도. 친숙한 그라운드·이동 피로 없음·관중 응원 영향. 모든 정량 팩터 합산 후 별도로 +1.5%p 가산.',
        range: '실측 (2023~2026 N=2180) 51.93% — 가산 1.93%p.',
        modelUsage: '+1.5%p 고정 가산 (HOME_ADVANTAGE=0.015)',
        source: '실측 데이터',
      },
    ],
  },
];

export default function GlossaryPage() {
  const allEntries = CATEGORIES.flatMap((c) => c.entries);

  const definedTermSetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'MoneyBall Score 야구 통계 용어 사전',
    description:
      'KBO 승부예측에 쓰이는 세이버메트릭스 지표 정의 모음',
    hasDefinedTerm: allEntries.map((e) => ({
      '@type': 'DefinedTerm',
      '@id': `https://moneyballscore.vercel.app/glossary#${e.id}`,
      name: `${e.abbr} (${e.korean})`,
      alternateName: e.fullName,
      description: e.definition,
      inDefinedTermSet: 'https://moneyballscore.vercel.app/glossary',
    })),
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSetJsonLd) }}
      />
      <Breadcrumb items={[{ label: '용어 사전' }]} />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">야구 통계 용어 사전</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          KBO 승부예측에 쓰이는 세이버메트릭스 지표 {allEntries.length}개
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          각 카드 안 정의 옆에 우리 모델 가중치를 표시했습니다. 예측 페이지에서 본 용어를 클릭하면 이 사전으로 이동합니다.
          상세 모델 구조는{' '}
          <Link
            href="/about"
            className="text-brand-600 dark:text-brand-300 hover:underline"
          >
            소개 페이지
          </Link>
          에서 확인하세요.
        </p>
      </header>

      <nav
        aria-label="용어 빠른 이동"
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4"
      >
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
          빠른 이동
        </h2>
        <ul className="flex flex-wrap gap-2">
          {allEntries.map((e) => (
            <li key={e.id}>
              <a
                href={`#${e.id}`}
                className="inline-block px-2.5 py-1 text-xs rounded-md bg-gray-100 dark:bg-[var(--color-surface)] text-gray-700 dark:text-gray-200 hover:bg-brand-100 dark:hover:bg-brand-900 hover:text-brand-700 dark:hover:text-brand-200 transition-colors"
              >
                {e.abbr}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {CATEGORIES.map((category) => (
        <section
          key={category.title}
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 space-y-4"
        >
          <div>
            <h2 className="text-xl font-bold">{category.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {category.description}
            </p>
          </div>

          <div className="space-y-4">
            {category.entries.map((entry) => (
              <article
                key={entry.id}
                id={entry.id}
                className="p-4 bg-surface rounded-lg scroll-mt-20"
              >
                <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3 className="text-lg font-bold font-mono text-brand-600 dark:text-brand-300">
                    {entry.abbr}
                  </h3>
                  <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {entry.korean}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {entry.fullName}
                  </span>
                </header>
                <p className="text-sm text-gray-700 dark:text-gray-200 mt-2 leading-relaxed">
                  {entry.definition}
                </p>
                <dl className="text-xs text-gray-500 dark:text-gray-400 mt-3 space-y-1">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-gray-600 dark:text-gray-300">정상 범위</dt>
                    <dd>{entry.range}</dd>
                  </div>
                  {entry.modelUsage && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-gray-600 dark:text-gray-300">우리 모델</dt>
                      <dd>{entry.modelUsage}</dd>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-gray-600 dark:text-gray-300">출처</dt>
                    <dd>{entry.source}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 space-y-2">
        <h2 className="text-lg font-bold">더 자세히</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          각 지표의 가중치 결정 근거와 운영 데이터는{' '}
          <Link href="/about" className="text-brand-600 dark:text-brand-300 hover:underline">
            소개
          </Link>
          {' / '}
          <Link href="/accuracy" className="text-brand-600 dark:text-brand-300 hover:underline">
            적중률
          </Link>
          {' / '}
          <Link href="/dashboard" className="text-brand-600 dark:text-brand-300 hover:underline">
            대시보드
          </Link>
          {' '}페이지에서 확인할 수 있습니다.
        </p>
      </section>
    </div>
  );
}
