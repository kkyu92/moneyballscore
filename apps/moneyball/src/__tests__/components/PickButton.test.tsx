import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText('AI 예측:')).toBeInTheDocument();
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
    expect(screen.getByText('AI 예측:')).toBeInTheDocument();
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
    expect(screen.getByText('선발 투수력 우세')).toBeInTheDocument();
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
});
