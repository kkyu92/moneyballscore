import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PickButton } from '@/components/picks/PickButton';

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({}),
  } as unknown as Response);
  localStorage.clear();
});

describe('PickButton AI 힌트', () => {
  it('AI 힌트 props 없으면 "AI 예측" 미표시', () => {
    render(<PickButton gameId={1} homeTeam="LG" awayTeam="SS" />);
    expect(screen.queryByText(/AI 예측/)).toBeNull();
  });

  it('aiPredictedWinner=home + aiWinProb=0.65 시 AI 힌트 표시', () => {
    render(
      <PickButton
        gameId={1}
        homeTeam="LG"
        awayTeam="SS"
        aiPredictedWinner="home"
        aiWinProb={0.65}
      />
    );
    expect(screen.getByText('AI 예측')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('aiPredictedWinner=away 시 AI 힌트에 "원정" + 신뢰도% 표시', () => {
    render(
      <PickButton
        gameId={2}
        homeTeam="LG"
        awayTeam="SS"
        aiPredictedWinner="away"
        aiWinProb={0.58}
      />
    );
    expect(screen.getByText('AI 예측')).toBeInTheDocument();
    expect(screen.getByText('58%')).toBeInTheDocument();
  });

  it('aiTopFactor 있으면 팩터 레이블 표시', () => {
    render(
      <PickButton
        gameId={3}
        homeTeam="LG"
        awayTeam="SS"
        aiPredictedWinner="home"
        aiWinProb={0.6}
        aiTopFactor="선발 투수력 우세"
      />
    );
    expect(screen.getByText('주요 팩터: 선발 투수력 우세')).toBeInTheDocument();
  });

  it('분석 보기 링크가 올바른 href 가짐', () => {
    render(
      <PickButton
        gameId={42}
        homeTeam="LG"
        awayTeam="SS"
        aiPredictedWinner="home"
        aiWinProb={0.6}
      />
    );
    const link = screen.getByRole('link', { name: /분석 보기/ });
    expect(link).toHaveAttribute('href', '/analysis/game/42');
  });

  it('aiWinProb만 있고 aiPredictedWinner 없으면 AI 힌트 미표시', () => {
    render(<PickButton gameId={1} homeTeam="LG" awayTeam="SS" aiWinProb={0.6} />);
    expect(screen.queryByText(/AI 예측/)).toBeNull();
  });

  it('league="mlb" + analysisHref 미지정 시 분석 보기 링크 미표시 (KBO 전용 /analysis/game/[id] 오연결 방지)', () => {
    render(
      <PickButton
        gameId="745444"
        league="mlb"
        homeTeam="NYY"
        awayTeam="BOS"
        aiPredictedWinner="home"
        aiWinProb={0.6}
      />
    );
    expect(screen.getByText('AI 예측')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /분석 보기/ })).toBeNull();
  });

  it('league="mlb" + analysisHref 지정 시 해당 href 사용', () => {
    render(
      <PickButton
        gameId="745444"
        league="mlb"
        homeTeam="NYY"
        awayTeam="BOS"
        aiPredictedWinner="home"
        aiWinProb={0.6}
        analysisHref="/mlb/games/2026-08-19/NYY-vs-BOS"
      />
    );
    const link = screen.getByRole('link', { name: /분석 보기/ });
    expect(link).toHaveAttribute('href', '/mlb/games/2026-08-19/NYY-vs-BOS');
  });
});

describe('PickButton league="mlb" — mlb-submit/mlb-poll route + storageKey 네임스페이스', () => {
  it('poll fetch 시 /api/picks/mlb-poll 호출 (KBO 는 /api/picks/poll)', () => {
    render(<PickButton gameId="745444" league="mlb" homeTeam="NYY" awayTeam="BOS" />);
    expect(global.fetch).toHaveBeenCalledWith('/api/picks/mlb-poll?ids=745444');
  });

  it('kbo (기본값) poll fetch 시 /api/picks/poll 호출', () => {
    render(<PickButton gameId={5} homeTeam="LG" awayTeam="SS" />);
    expect(global.fetch).toHaveBeenCalledWith('/api/picks/poll?ids=5');
  });

  it('픽 클릭 시 /api/picks/mlb-submit 로 external_game_id 필드 전송', () => {
    render(<PickButton gameId="745444" league="mlb" homeTeam="NYY" awayTeam="BOS" />);
    fireEvent.click(screen.getByRole('button', { name: /NYY 홈/ }));
    const submitCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => call[0] === '/api/picks/mlb-submit',
    );
    expect(submitCall).toBeDefined();
    const payload = JSON.parse((submitCall![1] as RequestInit).body as string);
    expect(payload.external_game_id).toBe('745444');
    expect(payload.pick).toBe('home');
  });

  it('MLB gameId 가 KBO 정수 game_id 와 값이 같아도 localStorage 키 충돌 없음', () => {
    // KBO game_id=745444 픽 저장
    const { unmount } = render(<PickButton gameId={745444} homeTeam="LG" awayTeam="SS" />);
    fireEvent.click(screen.getByRole('button', { name: /LG 홈/ }));
    unmount();

    // 동일 숫자 문자열의 MLB external_game_id 는 별도 네임스페이스 — 기존 KBO 픽 상태 영향 없음
    render(<PickButton gameId="745444" league="mlb" homeTeam="NYY" awayTeam="BOS" />);
    expect(screen.getByRole('button', { name: /NYY 홈/ })).toHaveAttribute('aria-pressed', 'false');
  });
});
