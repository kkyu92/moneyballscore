/**
 * PLAN_v5 Phase 4 §7.2 — 홈페이지 렌더 가드 (R3)
 *
 * 가드 R3: `predictions!inner` → `predictions(...)` (LEFT JOIN 동일 효과) 전환.
 * 예측 없는 경기 (predictions=[]) 가 홈 카드 목록에서 사라지면 안 됨.
 * 대신 PlaceholderCard 가 status/SP 분기와 함께 렌더되어야 함.
 *
 * 이 파일은 page.tsx 전체를 async server component 로 통째로 mount 하지
 * 않는다. 대신 두 가지 수준에서 커버:
 *
 *  1. PlaceholderCard 단위 — 5개 status 분기 + SP 미확정 + 정상 경로
 *  2. 홈 렌더 결정 로직 — page.tsx 의 map() 브랜칭과 동일한 inline 헬퍼로
 *     predictions=[] → PlaceholderCard, predictions=[{...}] → PredictionCard
 *     분기 확인. 실제 query 시그니처 (!inner→LEFT JOIN) 는 page.tsx 에만
 *     있고 여기선 결과 shape 이 로드되었을 때 올바르게 렌더되는지만 본다.
 *
 * 참고: next/image (TeamLogo 내부) 는 jsdom 에서 <img> 로 풀백되므로 그대로 사용.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PlaceholderCard } from '@/components/predictions/PlaceholderCard';

// next/image 는 jsdom 에서 <img> 로 내려가지만 src 가 로컬 경로라 network
// 없이 렌더만 됨. unoptimized=false 경고만 찍힘.
vi.mock('next/image', () => ({
  default: ({ src, alt, width, height }: {
    src: string; alt: string; width: number; height: number;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));

describe('PlaceholderCard — status 분기', () => {
  it('status="postponed" → 경기 취소 + 🚫 + SP 라인 숨김', () => {
    render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        gameTime="18:30"
        status="postponed"
        homeSPName="최민석"
        awaySPName="양현종"
      />,
    );

    expect(screen.getByText('경기 취소')).toBeInTheDocument();
    expect(screen.getByText('🚫')).toBeInTheDocument();
    // postponed 면 SP 라인 숨김 (데이터 없는 것처럼 보이도록)
    expect(screen.queryByText(/양현종.*최민석/)).not.toBeInTheDocument();
  });

  it('status="live" → 경기 진행중 + 🔴', () => {
    render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        gameTime="18:30"
        status="live"
      />,
    );

    expect(screen.getByText('경기 진행중')).toBeInTheDocument();
    expect(screen.getByText('🔴')).toBeInTheDocument();
  });

  it('status="final" → 경기 종료 · 예측 없음 + —', () => {
    render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        gameTime="18:30"
        status="final"
      />,
    );

    expect(screen.getByText('경기 종료 · 예측 없음')).toBeInTheDocument();
  });

  it('SP 미확정 (homeSP undefined) → 선발 확정 대기', () => {
    render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        gameTime="18:30"
        status="scheduled"
        awaySPName="양현종"
      />,
    );

    expect(screen.getByText('선발 확정 대기')).toBeInTheDocument();
  });

  it('SP 미확정 (awaySP undefined) → 선발 확정 대기', () => {
    render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        gameTime="18:30"
        status="scheduled"
        homeSPName="최민석"
      />,
    );

    expect(screen.getByText('선발 확정 대기')).toBeInTheDocument();
  });

  it('scheduled + SP 확정 + gameTime 18:30 → 예측 준비중 · 약 16:00 KST 생성', () => {
    render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        gameTime="18:30"
        status="scheduled"
        homeSPName="최민석"
        awaySPName="양현종"
      />,
    );

    expect(screen.getByText(/예측 준비중 · 약 16:00 KST 생성/)).toBeInTheDocument();
  });

  it('scheduled + SP 확정 + gameTime 14:00 → 예측 준비중 · 약 11:00 KST 생성', () => {
    render(
      <PlaceholderCard
        homeTeam="LG"
        awayTeam="SS"
        gameTime="14:00"
        status="scheduled"
        homeSPName="최민석"
        awaySPName="양현종"
      />,
    );

    expect(screen.getByText(/예측 준비중 · 약 11:00 KST 생성/)).toBeInTheDocument();
  });

  it('scheduled + SP 확정 + gameTime 없음 → "예측 준비중" + 기본 "18:30" 표시', () => {
    render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        status="scheduled"
        homeSPName="최민석"
        awaySPName="양현종"
      />,
    );

    expect(screen.getByText('예측 준비중')).toBeInTheDocument();
    expect(screen.getByText('18:30')).toBeInTheDocument();
  });

  it('scheduled + SP 확정 + status=null 도 정상 플레이스홀더 (예측 준비중)', () => {
    render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        gameTime="17:00"
        status={null}
        homeSPName="최민석"
        awaySPName="양현종"
      />,
    );

    expect(screen.getByText(/예측 준비중 · 약 14:00 KST 생성/)).toBeInTheDocument();
  });

  it('두 팀 로고 + 팀 약어 (첫 단어) 렌더', () => {
    const { container } = render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        gameTime="18:30"
      />,
    );

    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(2);
    // OB = "두산 베어스" → "두산"
    expect(screen.getByText('두산')).toBeInTheDocument();
    // HT = "KIA 타이거즈" → "KIA"
    expect(screen.getByText('KIA')).toBeInTheDocument();
  });

  it('SP 이름 둘 다 있고 status=scheduled → awaySP vs homeSP 순서로 표시', () => {
    render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        gameTime="18:30"
        status="scheduled"
        homeSPName="최민석"
        awaySPName="양현종"
      />,
    );

    expect(screen.getByText(/양현종.*vs.*최민석/)).toBeInTheDocument();
  });

  it('awaySP 만 있고 homeSP 없을 때 "미확정 vs 양현종" 표시 안됨 (SP 미확정 분기 우선)', () => {
    render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        gameTime="18:30"
        status="scheduled"
        awaySPName="양현종"
      />,
    );

    // status 메시지는 "선발 확정 대기"
    expect(screen.getByText('선발 확정 대기')).toBeInTheDocument();
    // 그래도 awaySP 있으니 SP 라인 표시 (미확정 vs 양현종)
    expect(screen.getByText(/양현종.*vs.*미확정/)).toBeInTheDocument();
  });
});

/**
 * a11y 보강 — 스크린리더 카드 요약 + 의미 있는 마크업.
 *
 * 이전엔 카드가 div 묶음이라 스크린리더가 "두산" "—" "KIA" "예측 준비중"
 * 처럼 토막 텍스트로 읽었음. <article aria-label> 로 매치업 + 시각 + 상태를
 * 한 문장으로 요약하고, 시각은 <time dateTime> 으로 의미 부여.
 */
describe('PlaceholderCard — a11y', () => {
  it('카드 전체가 article role + 매치업 요약 aria-label 포함', () => {
    render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        gameTime="18:30"
        status="scheduled"
        homeSPName="최민석"
        awaySPName="양현종"
      />,
    );

    // article + aria-label 한 문장 요약 (away vs home (홈) · 시각 · 상태)
    const card = screen.getByRole('article');
    const label = card.getAttribute('aria-label') ?? '';
    expect(label).toContain('KIA');
    expect(label).toContain('두산');
    expect(label).toContain('홈');
    expect(label).toContain('18:30');
    expect(label).toContain('예측 준비중');
  });

  it('postponed 상태도 article aria-label 에 "경기 취소" 포함', () => {
    render(
      <PlaceholderCard
        homeTeam="OB"
        awayTeam="HT"
        gameTime="18:30"
        status="postponed"
      />,
    );

    const label = screen.getByRole('article').getAttribute('aria-label') ?? '';
    expect(label).toContain('경기 취소');
  });

  it('gameTime 은 <time dateTime="HH:MM"> 으로 마크업', () => {
    const { container } = render(
      <PlaceholderCard homeTeam="OB" awayTeam="HT" gameTime="14:00" status="scheduled" />,
    );

    const timeEl = container.querySelector('time');
    expect(timeEl?.getAttribute('dateTime')).toBe('14:00');
    expect(timeEl?.textContent).toBe('14:00');
  });
});

/**
 * 가드 R3 — LEFT JOIN 결과 shape 별 렌더 결정.
 *
 * 이 헬퍼는 page.tsx:235-283 의 map() 브랜칭과 동일한 모양. 실제 page.tsx
 * 는 async server component 라 testing-library 로 직접 mount 불가. 대신
 * 이 헬퍼가 "predictions=[] 일 때 카드가 목록에서 사라지지 않음" 이라는
 * 가드를 구조적으로 보장하는지 검증.
 */

import { PredictionCard } from '@/components/predictions/PredictionCard';
import type { TeamCode } from '@moneyball/shared';

interface StubGame {
  id: number;
  game_time: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: { code: TeamCode | null } | null;
  away_team: { code: TeamCode | null } | null;
  home_sp: { name_ko: string | null } | null;
  away_sp: { name_ko: string | null } | null;
  predictions: Array<{
    predicted_winner: number;
    confidence: number;
    reasoning: { homeWinProb?: number } | null;
    home_sp_fip: number | null;
    away_sp_fip: number | null;
    home_lineup_woba: number | null;
    away_lineup_woba: number | null;
    is_correct: boolean | null;
    winner: { code: TeamCode | null } | null;
  }>;
}

function GameList({ games }: { games: StubGame[] }) {
  if (games.length === 0) {
    return <div>오늘 예측 데이터가 아직 없습니다</div>;
  }
  return (
    <div>
      {games.map((game) => {
        const pred = game.predictions?.[0];
        const homeCode = game.home_team?.code as TeamCode;
        const awayCode = game.away_team?.code as TeamCode;
        if (!pred) {
          return (
            <div key={game.id} data-game-id={game.id} data-kind="placeholder">
              <PlaceholderCard
                homeTeam={homeCode}
                awayTeam={awayCode}
                gameTime={game.game_time?.slice(0, 5)}
                status={game.status}
                homeSPName={game.home_sp?.name_ko ?? undefined}
                awaySPName={game.away_sp?.name_ko ?? undefined}
              />
            </div>
          );
        }
        const homeWinProbRaw = pred.reasoning?.homeWinProb;
        const winProb =
          homeWinProbRaw != null
            ? pred.winner?.code === homeCode
              ? homeWinProbRaw
              : 1 - homeWinProbRaw
            : undefined;
        return (
          <div key={game.id} data-game-id={game.id} data-kind="prediction">
            <PredictionCard
              homeTeam={homeCode}
              awayTeam={awayCode}
              confidence={pred.confidence}
              predictedWinner={pred.winner?.code as TeamCode}
              homeSPName={game.home_sp?.name_ko ?? undefined}
              awaySPName={game.away_sp?.name_ko ?? undefined}
              homeSPFip={pred.home_sp_fip ?? undefined}
              awaySPFip={pred.away_sp_fip ?? undefined}
              homeWoba={pred.home_lineup_woba ?? undefined}
              awayWoba={pred.away_lineup_woba ?? undefined}
              gameTime={game.game_time?.slice(0, 5)}
              isCorrect={pred.is_correct}
              homeScore={game.home_score}
              awayScore={game.away_score}
              winProb={winProb}
              gameId={game.id}
            />
          </div>
        );
      })}
    </div>
  );
}

function makeStubGame(overrides: Partial<StubGame> = {}): StubGame {
  return {
    id: 101,
    game_time: '18:30:00',
    status: 'scheduled',
    home_score: null,
    away_score: null,
    home_team: { code: 'OB' },
    away_team: { code: 'HT' },
    home_sp: { name_ko: '최민석' },
    away_sp: { name_ko: '양현종' },
    predictions: [],
    ...overrides,
  };
}

function makePrediction(
  winnerCode: TeamCode,
  overrides: Partial<StubGame['predictions'][0]> = {},
): StubGame['predictions'][0] {
  return {
    predicted_winner: 1,
    confidence: 0.25,
    reasoning: { homeWinProb: 0.6 },
    home_sp_fip: 3.8,
    away_sp_fip: 4.2,
    home_lineup_woba: 0.335,
    away_lineup_woba: 0.320,
    is_correct: null,
    winner: { code: winnerCode },
    ...overrides,
  };
}

describe('홈 게임 목록 렌더 (R3 — LEFT JOIN 가드)', () => {
  it('predictions=[] 는 PlaceholderCard 로, predictions=[{...}] 는 PredictionCard 로', () => {
    const games: StubGame[] = [
      // 예측 있음
      makeStubGame({
        id: 101,
        home_team: { code: 'OB' },
        away_team: { code: 'HT' },
        predictions: [makePrediction('OB')],
      }),
      // 예측 없음 (LEFT JOIN → 빈 배열)
      makeStubGame({
        id: 102,
        home_team: { code: 'LG' },
        away_team: { code: 'SS' },
        predictions: [],
      }),
      // 예측 없음 + postponed
      makeStubGame({
        id: 103,
        home_team: { code: 'LT' },
        away_team: { code: 'HH' },
        status: 'postponed',
        predictions: [],
      }),
    ];

    const { container } = render(<GameList games={games} />);

    // 3개 모두 렌더 (INNER JOIN 이었으면 102/103 은 사라졌을 것)
    const cards = container.querySelectorAll('[data-game-id]');
    expect(cards).toHaveLength(3);

    // 각 카드의 kind 확인
    expect(container.querySelector('[data-game-id="101"]')?.getAttribute('data-kind'))
      .toBe('prediction');
    expect(container.querySelector('[data-game-id="102"]')?.getAttribute('data-kind'))
      .toBe('placeholder');
    expect(container.querySelector('[data-game-id="103"]')?.getAttribute('data-kind'))
      .toBe('placeholder');
  });

  it('전 경기 예측 없음 (파이프라인 미실행 상황) → 모두 PlaceholderCard', () => {
    const games: StubGame[] = [
      makeStubGame({ id: 101, home_team: { code: 'OB' }, away_team: { code: 'HT' } }),
      makeStubGame({ id: 102, home_team: { code: 'LG' }, away_team: { code: 'SS' } }),
      makeStubGame({ id: 103, home_team: { code: 'LT' }, away_team: { code: 'HH' } }),
      makeStubGame({ id: 104, home_team: { code: 'WO' }, away_team: { code: 'KT' } }),
      makeStubGame({ id: 105, home_team: { code: 'SK' }, away_team: { code: 'NC' } }),
    ];

    const { container } = render(<GameList games={games} />);

    const cards = container.querySelectorAll('[data-game-id]');
    expect(cards).toHaveLength(5);
    const placeholders = container.querySelectorAll('[data-kind="placeholder"]');
    expect(placeholders).toHaveLength(5);

    // 5경기 = 5 플레이스홀더. "오늘 예측 데이터가 아직 없습니다" 메시지는
    // games.length === 0 일 때만 나오므로 나와선 안 됨.
    expect(screen.queryByText(/오늘 예측 데이터가 아직 없습니다/)).not.toBeInTheDocument();
  });

  it('games=[] → fallback 메시지', () => {
    render(<GameList games={[]} />);
    expect(screen.getByText(/오늘 예측 데이터가 아직 없습니다/)).toBeInTheDocument();
  });

  it('경기 취소 1 + 정상 4 → 5개 카드 모두 목록에 남음 (INNER JOIN regression 방지)', () => {
    const games: StubGame[] = [
      makeStubGame({ id: 101, predictions: [makePrediction('OB')] }),
      makeStubGame({
        id: 102, home_team: { code: 'LG' }, away_team: { code: 'SS' },
        predictions: [makePrediction('LG')],
      }),
      makeStubGame({
        id: 103, home_team: { code: 'LT' }, away_team: { code: 'HH' },
        predictions: [makePrediction('HH')],
      }),
      makeStubGame({
        id: 104, home_team: { code: 'WO' }, away_team: { code: 'KT' },
        predictions: [makePrediction('KT')],
      }),
      // 취소 + 예측 없음 (파이프라인이 postponed 를 이미 스킵한 경우)
      makeStubGame({
        id: 105, home_team: { code: 'SK' }, away_team: { code: 'NC' },
        status: 'postponed',
        predictions: [],
      }),
    ];

    const { container } = render(<GameList games={games} />);

    const cards = container.querySelectorAll('[data-game-id]');
    expect(cards).toHaveLength(5);

    const cancelled = container.querySelector('[data-game-id="105"]');
    expect(cancelled).not.toBeNull();
    expect(cancelled?.getAttribute('data-kind')).toBe('placeholder');
    expect(within(cancelled as HTMLElement).getByText('경기 취소')).toBeInTheDocument();
  });
});

/**
 * YesterdayResultsSection — 어제 경기 결과 섹션
 *
 * 이 헬퍼는 page.tsx:YesterdayResultsSection 과 동일한 렌더 로직.
 * 실제 page.tsx 는 async server component + supabase import 로 직접 mount 불가.
 * 핵심 검증: 적중/빗나감 배지, 점수 표시(null→'-'), "N/M 적중" 헤더, 전경기 노출.
 */

interface StubYesterdayGame {
  id: number;
  game_date: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
  predictions: Array<{ is_correct: boolean | null }>;
}

function YesterdaySection({ games }: { games: StubYesterdayGame[] }) {
  const withPred = games.filter((g) => g.predictions.length > 0);
  const correct = withPred.filter((g) => g.predictions[0]?.is_correct === true).length;
  const dateStr = games[0]?.game_date ?? '';
  const displayDate = dateStr ? dateStr.slice(5).replace('-', '/') : '';

  return (
    <section>
      <div>
        <h2>어제 결과</h2>
        {displayDate && <span data-testid="display-date">{displayDate}</span>}
        {withPred.length > 0 && (
          <span data-testid="accuracy">{correct}/{withPred.length} 적중</span>
        )}
      </div>
      <div>
        {games.map((g) => {
          const pred = g.predictions[0];
          const isCorrect = pred?.is_correct;
          const badge =
            isCorrect === true
              ? <span data-testid={`badge-${g.id}`}>적중</span>
              : isCorrect === false
                ? <span data-testid={`badge-${g.id}`}>빗나감</span>
                : null;
          return (
            <a key={g.id} href={`/analysis/game/${g.id}`} data-game-id={g.id}>
              <span>{g.away_team?.code ?? '?'}</span>
              <span data-testid={`score-${g.id}`}>{g.away_score ?? '-'} : {g.home_score ?? '-'}</span>
              <span>{g.home_team?.code ?? '?'}</span>
              {badge}
            </a>
          );
        })}
      </div>
    </section>
  );
}

describe('YesterdayResultsSection — 어제 결과 섹션', () => {
  it('적중 예측 → 적중 배지, 빗나간 예측 → 빗나감 배지', () => {
    const games: StubYesterdayGame[] = [
      { id: 1, game_date: '2026-05-06', home_score: 5, away_score: 3,
        home_team: { code: 'OB' }, away_team: { code: 'HT' },
        predictions: [{ is_correct: true }] },
      { id: 2, game_date: '2026-05-06', home_score: 2, away_score: 4,
        home_team: { code: 'LG' }, away_team: { code: 'SS' },
        predictions: [{ is_correct: false }] },
    ];
    render(<YesterdaySection games={games} />);

    expect(screen.getByTestId('badge-1').textContent).toBe('적중');
    expect(screen.getByTestId('badge-2').textContent).toBe('빗나감');
  });

  it('예측 없는 경기는 배지 미노출 + 행은 여전히 렌더됨', () => {
    const games: StubYesterdayGame[] = [
      { id: 1, game_date: '2026-05-06', home_score: 5, away_score: 3,
        home_team: { code: 'OB' }, away_team: { code: 'HT' },
        predictions: [] },
    ];
    render(<YesterdaySection games={games} />);

    expect(screen.queryByTestId('badge-1')).toBeNull();
    expect(screen.getByText('HT')).toBeInTheDocument();
    expect(screen.getByText('OB')).toBeInTheDocument();
  });

  it('"N/M 적중" 헤더 — 예측 있는 경기만 분모, 적중만 분자', () => {
    const games: StubYesterdayGame[] = [
      { id: 1, game_date: '2026-05-06', home_score: 3, away_score: 1,
        home_team: { code: 'OB' }, away_team: { code: 'HT' },
        predictions: [{ is_correct: true }] },
      { id: 2, game_date: '2026-05-06', home_score: 0, away_score: 2,
        home_team: { code: 'LG' }, away_team: { code: 'SS' },
        predictions: [{ is_correct: false }] },
      { id: 3, game_date: '2026-05-06', home_score: 4, away_score: 1,
        home_team: { code: 'LT' }, away_team: { code: 'HH' },
        predictions: [] },
    ];
    render(<YesterdaySection games={games} />);

    // 예측 있는 경기 2건 중 1 적중 → "1/2 적중"
    expect(screen.getByTestId('accuracy').textContent).toBe('1/2 적중');
  });

  it('점수 null → "-" 표시 (스코어 미기입 방어)', () => {
    const games: StubYesterdayGame[] = [
      { id: 1, game_date: '2026-05-06', home_score: null, away_score: null,
        home_team: { code: 'OB' }, away_team: { code: 'HT' },
        predictions: [] },
    ];
    render(<YesterdaySection games={games} />);

    expect(screen.getByTestId('score-1').textContent).toBe('- : -');
  });

  it('날짜 헤더 "MM/DD" 형식으로 표시', () => {
    const games: StubYesterdayGame[] = [
      { id: 1, game_date: '2026-05-06', home_score: 3, away_score: 2,
        home_team: { code: 'OB' }, away_team: { code: 'HT' },
        predictions: [] },
    ];
    render(<YesterdaySection games={games} />);

    expect(screen.getByTestId('display-date').textContent).toBe('05/06');
  });

  it('전경기 행 렌더 — 예측 없는 경기도 목록에서 제외되지 않음', () => {
    const games: StubYesterdayGame[] = [
      { id: 1, game_date: '2026-05-06', home_score: 5, away_score: 2,
        home_team: { code: 'OB' }, away_team: { code: 'HT' },
        predictions: [{ is_correct: true }] },
      { id: 2, game_date: '2026-05-06', home_score: 1, away_score: 3,
        home_team: { code: 'LG' }, away_team: { code: 'SS' },
        predictions: [] },
    ];
    const { container } = render(<YesterdaySection games={games} />);

    const rows = container.querySelectorAll('[data-game-id]');
    expect(rows).toHaveLength(2);
  });

  it('분석 페이지 링크 — /analysis/game/[id] 경로', () => {
    const games: StubYesterdayGame[] = [
      { id: 42, game_date: '2026-05-06', home_score: 3, away_score: 1,
        home_team: { code: 'OB' }, away_team: { code: 'HT' },
        predictions: [{ is_correct: true }] },
    ];
    const { container } = render(<YesterdaySection games={games} />);

    const link = container.querySelector('[data-game-id="42"]') as HTMLAnchorElement;
    expect(link?.getAttribute('href')).toBe('/analysis/game/42');
  });
});
