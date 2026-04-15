import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentArgumentBox } from '@/components/analysis/AgentArgumentBox';

function renderBox(overrides = {}) {
  return render(
    <AgentArgumentBox
      team="LG"
      role="home"
      confidence={0.65}
      keyFactor="선발 매치업"
      strengths={['임찬규 FIP 3.42', 'wOBA 0.340 우위']}
      opponentWeaknesses={['두산 불펜 FIP 4.2']}
      reasoning="선발 투수 FIP 격차가 결정적. 타선도 우위."
      {...overrides}
    />
  );
}

describe('AgentArgumentBox', () => {
  it('팀명 렌더', () => {
    renderBox();
    expect(screen.getByText(/LG 트윈스 에이전트/)).toBeInTheDocument();
  });

  it('confidence % 표시', () => {
    renderBox();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('key factor 표시', () => {
    renderBox();
    expect(screen.getByText(/선발 매치업/)).toBeInTheDocument();
  });

  it('strengths 리스트 (최대 3개)', () => {
    renderBox({
      strengths: ['s1', 's2', 's3', 's4', 's5'],
    });
    expect(screen.getByText('s1')).toBeInTheDocument();
    expect(screen.getByText('s2')).toBeInTheDocument();
    expect(screen.getByText('s3')).toBeInTheDocument();
    expect(screen.queryByText('s4')).not.toBeInTheDocument();
  });

  it('emphasized=true 시 scale 클래스', () => {
    const { container } = renderBox({ emphasized: true });
    const section = container.querySelector('section');
    expect(section?.className).toContain('scale-105');
  });

  it('emphasized=false 시 scale 없음', () => {
    const { container } = renderBox({ emphasized: false });
    const section = container.querySelector('section');
    expect(section?.className).not.toContain('scale-105');
  });

  it('빈 strengths/weaknesses 정상 렌더', () => {
    renderBox({
      strengths: [],
      opponentWeaknesses: [],
      reasoning: '',
    });
    expect(screen.getByText(/LG 트윈스 에이전트/)).toBeInTheDocument();
  });

  it('aria-labelledby 연결', () => {
    const { container } = renderBox();
    const section = container.querySelector('section');
    const labelledBy = section?.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    if (labelledBy) expect(document.getElementById(labelledBy)).toBeTruthy();
  });
});
